// Adventure codes and groups, against an in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const User = require("../src/models/User");
const Adventure = require("../src/models/Adventure");
const AdventureAccess = require("../src/models/AdventureAccess");

let mongod;
let api;
let eq1; // unlocked catalogue adventure
let eq2; // "Coming Soon"

const ADMIN = { "x-admin-key": "test-admin-key" };
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (res) => res.json();

const registerUser = async (email, password = "password123") => {
  const username = email.split("@")[0];
  let res = await api.post("/api/auth/signup", {
    firstName: "Test",
    lastName: username,
    username,
    email,
    password,
  });
  assert.equal(res.status, 201, "signup");
  res = await api.post("/api/auth/verify-email", { email, otp: lastOtpFor(email) });
  assert.equal(res.status, 200, "verify");
  res = await api.post("/api/auth/login", { email, password });
  const body = await json(res);
  return { id: body.user.id, token: body.token };
};

const registerGm = async (email) => {
  const u = await registerUser(email);
  assert.equal((await api.post("/api/auth/upgrade-member", { userId: u.id }, ADMIN)).status, 200);
  assert.equal((await api.post("/api/auth/upgrade-gm", { userId: u.id }, ADMIN)).status, 200);
  return u;
};

const post = (path, me, body = {}) => api.post(`/api/adventures${path}`, body, bearer(me.token));
const get = (path, me) => api.get(`/api/adventures${path}`, bearer(me.token));
const del = (path, me) =>
  fetch(`${api.base}/api/adventures${path}`, { method: "DELETE", headers: bearer(me.token) });

// A GM's group for eq1, returned as { code, groupId }.
const makeGroup = async (gm) => {
  const res = await post("/codes", gm, { adventureId: String(eq1._id) });
  assert.equal(res.status, 200);
  const body = await json(res);
  return { code: body.accessCode, groupId: String(body.group.id) };
};

const enter = (me, code) => post("/enter-code", me, { code });

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await AdventureAccess.init();
  await Adventure.init();
  api = await start();

  eq1 = await Adventure.create({
    slug: "eq1",
    title: "Adventure 1",
    subtitle: "Hudson River",
    unlocked: true,
    order: 1,
  });
  eq2 = await Adventure.create({
    slug: "eq2",
    title: "Adventure 2",
    subtitle: "Coming Soon",
    unlocked: false,
    order: 2,
  });
  // An old sample adventure (no slug) and an unpublished one must not be listed.
  await Adventure.create({ title: "Old sample", location: { latitude: 1, longitude: 2 } });
  await Adventure.create({ slug: "hidden", title: "Hidden", isPublished: false, order: 3 });
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

/* ===================== CATALOGUE ===================== */

test("the adventure list holds only published catalogue entries, in order", async () => {
  const player = await registerUser("catplayer@example.com");

  assert.equal((await api.get("/api/adventures")).status, 401);

  const list = await json(await get("", player));
  assert.deepEqual(
    list.map((a) => [a.slug, a.unlocked, a.subtitle]),
    [
      ["eq1", true, "Hudson River"],
      ["eq2", false, "Coming Soon"],
    ]
  );
});

/* ===================== CREATING CODES ===================== */

test("only Game Masters can create a code, and only for an open adventure", async () => {
  const player = await registerUser("cplayer@example.com");
  const gm = await registerGm("cgm@example.com");

  // Plain players are refused on both route names.
  for (const path of ["/codes", "/purchase"]) {
    assert.equal((await post(path, player, { adventureId: String(eq1._id) })).status, 403, path);
  }

  assert.equal((await post("/codes", gm, {})).status, 400);
  assert.equal((await post("/codes", gm, { adventureId: "nope" })).status, 400);
  assert.equal(
    (await post("/codes", gm, { adventureId: new mongoose.Types.ObjectId().toString() })).status,
    404
  );

  // "Coming Soon" adventures cannot get codes.
  const locked = await post("/codes", gm, { adventureId: String(eq2._id) });
  assert.equal(locked.status, 400);
  assert.match((await json(locked)).message, /not open yet/);

  const res = await post("/codes", gm, { adventureId: String(eq1._id) });
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.match(body.accessCode, /^[A-Z2-9]{6}$/);
  assert.equal(body.group.role, "owner");
  assert.equal(body.group.playerCount, 1);

  // Asking again returns the same code, not a second group.
  const again = await json(await post("/codes", gm, { adventureId: String(eq1._id) }));
  assert.equal(again.accessCode, body.accessCode);
  assert.equal(await AdventureAccess.countDocuments({ owner: gm.id }), 1);
});

/* ===================== ENTERING CODES ===================== */

test("any player can enter a code once, case-insensitively, and the owner too", async () => {
  const gm = await registerGm("egm@example.com");
  const p = await registerUser("eplayer@example.com");
  const { code, groupId } = await makeGroup(gm);

  let res = await enter(p, code.toLowerCase());
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.message, "Access granted");
  assert.equal(body.group.role, "player");
  assert.equal(body.group.playerCount, 2);
  assert.equal(body.group.code, undefined, "players are not handed the code");

  // Entering again (or as the owner) adds nobody.
  assert.equal((await enter(p, code)).status, 200);
  assert.equal((await enter(gm, code)).status, 200);
  const stored = await AdventureAccess.findById(groupId);
  assert.equal(stored.players.length, 2);

  // Bad input.
  assert.equal((await enter(p, "ZZZZZZ")).status, 404);
  assert.equal((await post("/enter-code", p, {})).status, 400);
  for (const evil of [{ $ne: null }, { $gt: "" }, { $regex: ".*" }]) {
    assert.equal((await enter(p, evil)).status, 400);
  }
});

test("a locked adventure's code cannot be redeemed", async () => {
  const gm = await registerGm("lgm@example.com");
  const p = await registerUser("lplayer@example.com");

  // Created while the adventure was still open, then it was locked.
  const open = await Adventure.create({ slug: "later", title: "Later", unlocked: true, order: 9 });
  const res = await post("/codes", gm, { adventureId: String(open._id) });
  const { accessCode } = await json(res);

  await Adventure.updateOne({ _id: open._id }, { unlocked: false });
  assert.equal((await enter(p, accessCode)).status, 400);
});

/* ===================== GROUPS ===================== */

test("groups list shows my role, and only the owner sees the code and state", async () => {
  const gm = await registerGm("ggm@example.com");
  const p = await registerUser("gplayer@example.com");
  const stranger = await registerUser("gstranger@example.com");
  const { code, groupId } = await makeGroup(gm);
  await enter(p, code);

  const owned = await json(await get("/groups", gm));
  assert.equal(owned.length, 1);
  assert.equal(owned[0].role, "owner");
  assert.equal(owned[0].code, code);
  assert.equal(owned[0].isActive, true);
  assert.equal(owned[0].playerCount, 2);
  assert.equal(owned[0].adventure.title, "Adventure 1");

  const joined = await json(await get("/groups", p));
  assert.equal(joined[0].role, "player");
  assert.equal(joined[0].code, undefined);
  assert.equal(joined[0].isActive, undefined);

  assert.deepEqual(await json(await get("/groups", stranger)), []);

  // Detail: members see the players, owner first; strangers get a 404.
  const detail = await json(await get(`/groups/${groupId}`, p));
  assert.deepEqual(detail.players.map((x) => x.role), ["owner", "player"]);
  assert.equal(detail.code, undefined);
  assert.equal((await json(await get(`/groups/${groupId}`, gm))).code, code);
  assert.equal((await get(`/groups/${groupId}`, stranger)).status, 404);
  assert.equal((await get(`/groups/nope`, p)).status, 400);

  // The original route no longer leaks the code to players either.
  const mineP = await json(await get("/my-adventures", p));
  assert.equal(mineP[0].accessCode, undefined);
  const mineGm = await json(await get("/my-adventures", gm));
  assert.equal(mineGm[0].accessCode, code);
});

test("players can leave; the owner cannot, but can delete the group", async () => {
  const gm = await registerGm("lvgm@example.com");
  const p = await registerUser("lvplayer@example.com");
  const { code, groupId } = await makeGroup(gm);
  await enter(p, code);

  assert.equal((await post(`/groups/${groupId}/leave`, gm)).status, 400);
  assert.equal((await post(`/groups/${groupId}/leave`, p)).status, 200);
  assert.equal((await post(`/groups/${groupId}/leave`, p)).status, 404, "no longer a member");
  assert.deepEqual(await json(await get("/groups", p)), []);

  await enter(p, code);
  assert.equal((await del(`/groups/${groupId}`, p)).status, 403);
  assert.equal((await del(`/groups/${groupId}`, gm)).status, 200);
  assert.equal(await AdventureAccess.countDocuments({ _id: groupId }), 0);
  assert.deepEqual(await json(await get("/groups", p)), []);
});

/* ===================== OWNER CONTROLS ===================== */

test("the owner can remove players, but not themselves, and others cannot", async () => {
  const gm = await registerGm("rmgm@example.com");
  const a = await registerUser("rma@example.com");
  const b = await registerUser("rmb@example.com");
  const { code, groupId } = await makeGroup(gm);
  await enter(a, code);
  await enter(b, code);

  assert.equal((await post(`/groups/${groupId}/remove`, a, { userId: b.id })).status, 403);
  assert.equal((await post(`/groups/${groupId}/remove`, gm, { userId: gm.id })).status, 400);
  assert.equal((await post(`/groups/${groupId}/remove`, gm, { userId: "nope" })).status, 400);
  assert.equal(
    (await post(`/groups/${groupId}/remove`, gm, { userId: new mongoose.Types.ObjectId().toString() }))
      .status,
    404
  );

  assert.equal((await post(`/groups/${groupId}/remove`, gm, { userId: b.id })).status, 200);
  assert.deepEqual(await json(await get("/groups", b)), []);
  assert.equal((await json(await get(`/groups/${groupId}`, gm))).players.length, 2);
});

test("a new code replaces the old one but keeps the players", async () => {
  const gm = await registerGm("ncgm@example.com");
  const a = await registerUser("nca@example.com");
  const late = await registerUser("ncl@example.com");
  const { code, groupId } = await makeGroup(gm);
  await enter(a, code);

  assert.equal((await post(`/groups/${groupId}/new-code`, a)).status, 403);

  const res = await post(`/groups/${groupId}/new-code`, gm);
  assert.equal(res.status, 200);
  const fresh = (await json(res)).code;
  assert.match(fresh, /^[A-Z2-9]{6}$/);
  assert.notEqual(fresh, code);

  assert.equal((await enter(late, code)).status, 404, "the old code is dead");
  assert.equal((await enter(late, fresh)).status, 200);
  assert.equal((await json(await get(`/groups/${groupId}`, gm))).players.length, 3);
});

test("pausing stops new joins and resuming allows them again", async () => {
  const gm = await registerGm("pgm@example.com");
  const a = await registerUser("pausea@example.com");
  const b = await registerUser("pauseb@example.com");
  const { code, groupId } = await makeGroup(gm);
  await enter(a, code);

  assert.equal((await post(`/groups/${groupId}/active`, a, { isActive: false })).status, 403);
  assert.equal((await post(`/groups/${groupId}/active`, gm, {})).status, 400);
  assert.equal((await post(`/groups/${groupId}/active`, gm, { isActive: "no" })).status, 400);

  let res = await post(`/groups/${groupId}/active`, gm, { isActive: false });
  assert.equal((await json(res)).isActive, false);
  assert.equal((await enter(b, code)).status, 404);
  // Players already inside stay.
  assert.equal((await json(await get(`/groups/${groupId}`, gm))).players.length, 2);

  res = await post(`/groups/${groupId}/active`, gm, { isActive: true });
  assert.equal((await json(res)).isActive, true);
  assert.equal((await enter(b, code)).status, 200);
});

/* ===================== CHAT LINK ===================== */

test("a shared group makes players chat contacts until they leave or are removed", async () => {
  const gm = await registerGm("chgm@example.com");
  const a = await registerUser("cha@example.com");
  const b = await registerUser("chb@example.com");
  const { code, groupId } = await makeGroup(gm);

  const contacts = async (u) =>
    (await json(await api.get("/api/chat/contacts", bearer(u.token)))).map((c) => String(c.id));

  assert.deepEqual(await contacts(a), [], "nobody to chat with before joining");

  await enter(a, code);
  await enter(b, code);
  assert.deepEqual((await contacts(a)).sort(), [String(gm.id), String(b.id)].sort());

  // Leaving ends the link both ways.
  await post(`/groups/${groupId}/leave`, b);
  assert.deepEqual(await contacts(a), [String(gm.id)]);
  assert.deepEqual(await contacts(b), []);

  // So does being removed by the owner.
  await post(`/groups/${groupId}/remove`, gm, { userId: a.id });
  assert.deepEqual(await contacts(a), []);
});
