// Game Mentor applications, approval and revocation, against an in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";
process.env.GM_APPLY_RATE_LIMIT_MAX = "1000";
process.env.ADMIN_EMAILS = "admin@example.com";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const User = require("../src/models/User");
const Club = require("../src/models/Club");
const AdventureAccess = require("../src/models/AdventureAccess");
const Adventure = require("../src/models/Adventure");
const GmApplication = require("../src/models/GmApplication");
const conduct = require("../src/utils/conduct");

let mongod;
let api;
let admin;
let eq1;

const ADMIN_KEY = { "x-admin-key": "test-admin-key" };
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (res) => res.json();
const MESSAGE = "I have run tabletop games for my school group for three years.";

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

// A paying member (the admin grants membership; there is no payment step yet).
const registerMember = async (email) => {
  const u = await registerUser(email);
  assert.equal((await api.post("/api/auth/upgrade-member", { userId: u.id }, ADMIN_KEY)).status, 200);
  return u;
};

const apply = (me, body = { message: MESSAGE, conductVersion: conduct.version }) =>
  api.post("/api/gm/applications", body, bearer(me.token));
const status = async (me) => json(await api.get("/api/gm/applications/me", bearer(me.token)));
const adminGet = (path, me = admin) => api.get(`/api/gm${path}`, bearer(me.token));
const adminPost = (path, body = {}, me = admin) => api.post(`/api/gm${path}`, body, bearer(me.token));

// The one pending application for a player, as the admin sees it.
const pendingFor = async (player) => {
  const list = await json(await adminGet("/admin/applications?status=pending"));
  return list.find((a) => String(a.applicant.id) === String(player.id));
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await GmApplication.init();
  api = await start();

  admin = await registerUser("admin@example.com");
  eq1 = await Adventure.create({ slug: "eq1", title: "Adventure 1", unlocked: true, order: 1 });
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

/* ===================== PLAYER SIDE ===================== */

test("the code of conduct is served, and every endpoint needs a login", async () => {
  assert.equal((await api.get("/api/gm/conduct")).status, 401);
  assert.equal((await api.get("/api/gm/applications/me")).status, 401);

  const player = await registerUser("conductplayer@example.com");
  const res = await api.get("/api/gm/conduct", bearer(player.token));
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.version, conduct.version);
  assert.ok(body.points.length >= 5);
});

test("your standing depends on your account type", async () => {
  const player = await registerUser("stplayer@example.com");
  const member = await registerMember("stmember@example.com");

  assert.equal((await status(player)).state, "membership_required");
  assert.equal((await status(member)).state, "can_apply");

  // Members who are already Game Mentors are told so.
  const gm = await registerMember("stgm@example.com");
  await api.post("/api/auth/upgrade-gm", { userId: gm.id }, ADMIN_KEY);
  assert.equal((await status(gm)).state, "gm");
});

test("only members can apply, with a real message and the current conduct version", async () => {
  const player = await registerUser("applyplayer@example.com");
  const member = await registerMember("applymember@example.com");

  // Plain players must become members first.
  const res = await apply(player);
  assert.equal(res.status, 403);
  assert.match((await json(res)).message, /members/i);

  for (const body of [
    {},
    { conductVersion: conduct.version },
    { message: "too short", conductVersion: conduct.version },
    { message: "x".repeat(501), conductVersion: conduct.version },
    { message: 12345, conductVersion: conduct.version },
  ]) {
    assert.equal((await apply(member, body)).status, 400, JSON.stringify(body).slice(0, 40));
  }
  // Not agreeing to the current conduct text is refused.
  assert.equal((await apply(member, { message: MESSAGE })).status, 400);
  assert.equal((await apply(member, { message: MESSAGE, conductVersion: "old" })).status, 400);
  assert.equal(await GmApplication.countDocuments({ user: member.id }), 0);

  const ok = await apply(member);
  assert.equal(ok.status, 201);
  const saved = await GmApplication.findOne({ user: member.id });
  assert.equal(saved.status, "pending");
  assert.equal(saved.conductVersion, conduct.version);
  assert.ok(saved.conductAcceptedAt);

  assert.equal((await status(member)).state, "pending");

  // A second application while one is waiting is refused.
  const again = await apply(member);
  assert.equal(again.status, 400);
  assert.match((await json(again)).message, /under review/);
  assert.equal(await GmApplication.countDocuments({ user: member.id }), 1);
});

/* ===================== ADMIN SIDE ===================== */

test("only admins can review applications or manage Game Mentors", async () => {
  const member = await registerMember("adminonlymember@example.com");
  await apply(member);
  const application = await GmApplication.findOne({ user: member.id });

  assert.equal((await api.get("/api/gm/admin/applications")).status, 401);
  for (const call of [
    adminGet("/admin/applications", member),
    adminGet("/admin/gms", member),
    adminPost(`/admin/applications/${application._id}/approve`, {}, member),
    adminPost(`/admin/applications/${application._id}/decline`, {}, member),
    adminPost(`/admin/gms/${member.id}/revoke`, {}, member),
  ]) {
    assert.equal((await call).status, 403);
  }
  assert.equal((await GmApplication.findById(application._id)).status, "pending");
  assert.equal((await User.findById(member.id)).accountType, "member");
});

test("an admin sees pending applications with who applied", async () => {
  const member = await registerMember("seenmember@example.com");
  await apply(member);

  const mine = await pendingFor(member);
  assert.ok(mine, "the application is listed");
  assert.equal(mine.applicant.name, "Test seenmember");
  assert.equal(mine.applicant.username, "seenmember");
  assert.equal(mine.applicant.email, "seenmember@example.com");
  assert.equal(mine.message, MESSAGE);

  assert.equal((await adminGet("/admin/applications?status=bogus")).status, 400);
});

test("approving makes the member a Game Mentor who can then create a club", async () => {
  const member = await registerMember("approvedmember@example.com");

  // A member cannot create a club yet.
  assert.equal(
    (await api.post("/api/club/create", { clubName: "Too early" }, bearer(member.token))).status,
    403
  );

  await apply(member);
  const app = await pendingFor(member);

  const res = await adminPost(`/admin/applications/${app.id}/approve`, { note: "Welcome aboard" });
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.status, "approved");
  assert.equal(body.decisionNote, "Welcome aboard");

  const user = await User.findById(member.id);
  assert.equal(user.accountType, "gm");
  assert.equal(user.permissions.canCreateClub, true);
  assert.equal((await status(member)).state, "gm");

  assert.equal(
    (await api.post("/api/club/create", { clubName: "Now allowed" }, bearer(member.token))).status,
    200
  );

  // Decided applications cannot be decided again, and leave the pending list.
  assert.equal((await adminPost(`/admin/applications/${app.id}/approve`)).status, 400);
  assert.equal((await adminPost(`/admin/applications/${app.id}/decline`)).status, 400);
  assert.equal(await pendingFor(member), undefined);
  const approved = await json(await adminGet("/admin/applications?status=approved"));
  assert.ok(approved.some((a) => a.id === app.id));
});

test("declining keeps the account as it is, shows the note, and allows reapplying", async () => {
  const member = await registerMember("declinedmember@example.com");
  await apply(member);
  const app = await pendingFor(member);

  assert.equal(
    (await adminPost(`/admin/applications/${app.id}/decline`, { note: "x".repeat(301) })).status,
    400
  );
  const res = await adminPost(`/admin/applications/${app.id}/decline`, { note: "Please join a few sessions first" });
  assert.equal(res.status, 200);

  assert.equal((await User.findById(member.id)).accountType, "member");
  const mine = await status(member);
  assert.equal(mine.state, "can_apply");
  assert.equal(mine.application.status, "declined");
  assert.equal(mine.application.decisionNote, "Please join a few sessions first");

  // They may try again, and the new application is a separate record.
  assert.equal((await apply(member)).status, 201);
  assert.equal(await GmApplication.countDocuments({ user: member.id }), 2);
});

test("bad ids and applicants who stopped being members are refused", async () => {
  assert.equal((await adminPost("/admin/applications/nope/approve")).status, 400);
  assert.equal(
    (await adminPost(`/admin/applications/${new mongoose.Types.ObjectId()}/approve`)).status,
    404
  );

  const member = await registerMember("lapsedmember@example.com");
  await apply(member);
  const app = await pendingFor(member);

  // Their membership lapsed before the admin got to it.
  await User.updateOne({ _id: member.id }, { accountType: "registrant" });
  const res = await adminPost(`/admin/applications/${app.id}/approve`);
  assert.equal(res.status, 400);
  assert.match((await json(res)).message, /not a member/);
  assert.equal((await GmApplication.findById(app.id)).status, "pending");
});

/* ===================== REVOKING ===================== */

test("revoking deletes the club and groups, frees everyone, and removes GM rights", async () => {
  const gm = await registerMember("revokedgm@example.com");
  await api.post("/api/auth/upgrade-gm", { userId: gm.id }, ADMIN_KEY);
  const clubMember = await registerUser("revclubmember@example.com");
  const groupPlayer = await registerUser("revgroupplayer@example.com");

  // The GM runs a club with one member and an adventure group with one player.
  const club = await json(
    await api.post("/api/club/create", { clubName: "Doomed" }, bearer(gm.token))
  );
  await api.post("/api/club/join", { clubCode: club.clubCode }, bearer(clubMember.token));
  await api.post("/api/club/approve", { memberId: clubMember.id }, bearer(gm.token));

  const codeRes = await json(
    await api.post("/api/adventures/codes", { adventureId: String(eq1._id) }, bearer(gm.token))
  );
  await api.post("/api/adventures/enter-code", { code: codeRes.accessCode }, bearer(groupPlayer.token));

  // They are chat contacts of the GM before the revoke.
  const contacts = async (u) =>
    (await json(await api.get("/api/chat/contacts", bearer(u.token)))).map((c) => String(c.id));
  assert.deepEqual(await contacts(clubMember), [String(gm.id)]);
  assert.deepEqual(await contacts(groupPlayer), [String(gm.id)]);

  // The admin list reports what a revoke would delete.
  const listed = (await json(await adminGet("/admin/gms"))).find((g) => String(g.id) === String(gm.id));
  assert.deepEqual(listed.impact, { club: { name: "Doomed", members: 1 }, groups: 1, groupPlayers: 1 });

  const res = await adminPost(`/admin/gms/${gm.id}/revoke`);
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.accountType, "member");
  assert.equal(body.impact.groups, 1);

  // The GM is a member again, without GM permissions.
  const user = await User.findById(gm.id);
  assert.equal(user.accountType, "member");
  assert.equal(user.permissions.canCreateClub, false);
  assert.equal(user.clubCode, null);
  assert.equal(
    (await api.post("/api/club/create", { clubName: "Again" }, bearer(gm.token))).status,
    403
  );

  // Club and group are gone, and everyone in them is free and no longer connected.
  assert.equal(await Club.countDocuments({ clubCode: club.clubCode }), 0);
  assert.equal(await AdventureAccess.countDocuments({ owner: gm.id }), 0);
  const freed = await User.findById(clubMember.id);
  assert.equal(freed.clubCode, null);
  assert.equal(freed.clubApproved, false);
  assert.deepEqual(await contacts(clubMember), []);
  assert.deepEqual(await contacts(groupPlayer), []);
  assert.deepEqual(await json(await api.get("/api/adventures/groups", bearer(groupPlayer.token))), []);

  // They no longer appear in the Game Mentor list, and can apply again.
  const after = await json(await adminGet("/admin/gms"));
  assert.ok(!after.some((g) => String(g.id) === String(gm.id)));
  assert.equal((await status(gm)).state, "can_apply");
});

test("a Game Mentor without an active membership goes back to registered", async () => {
  const gm = await registerUser("nomembership@example.com");
  // Promoted by hand without the membership flag being set.
  await User.updateOne({ _id: gm.id }, { accountType: "gm", membershipActive: false });

  const res = await adminPost(`/admin/gms/${gm.id}/revoke`);
  assert.equal(res.status, 200);
  assert.equal((await json(res)).accountType, "registrant");
});

test("only Game Mentors can be revoked, and ids are validated", async () => {
  const member = await registerMember("notagm@example.com");

  assert.equal((await adminPost(`/admin/gms/${member.id}/revoke`)).status, 400);
  assert.equal((await adminPost("/admin/gms/nope/revoke")).status, 400);
  assert.equal(
    (await adminPost(`/admin/gms/${new mongoose.Types.ObjectId()}/revoke`)).status,
    404
  );
  assert.equal((await User.findById(member.id)).accountType, "member");
});

test("a Game Mentor with no club or groups can be revoked too", async () => {
  const gm = await registerMember("emptygm@example.com");
  await api.post("/api/auth/upgrade-gm", { userId: gm.id }, ADMIN_KEY);

  const res = await adminPost(`/admin/gms/${gm.id}/revoke`);
  assert.equal(res.status, 200);
  assert.deepEqual((await json(res)).impact, { club: null, groups: 0, groupPlayers: 0 });
});
