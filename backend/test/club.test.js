// Club flow: create, join, approve, roles, leave and delete, against an in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const User = require("../src/models/User");
const Club = require("../src/models/Club");

let mongod;
let api;

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

const post = (path, me, body = {}) => api.post(`/api/club${path}`, body, bearer(me.token));
const view = async (me) => json(await api.get("/api/club/me", bearer(me.token)));
const del = (path, me) =>
  fetch(`${api.base}/api/club${path}`, { method: "DELETE", headers: bearer(me.token) });
const patch = (path, me, body) =>
  fetch(`${api.base}/api/club${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(me.token) },
    body: JSON.stringify(body),
  });

// A club with a GM and any number of approved members.
const makeClub = async (gm, members = [], name = "Test Club") => {
  const club = await json(await post("/create", gm, { clubName: name }));
  for (const m of members) {
    assert.equal((await post("/join", m, { clubCode: club.clubCode })).status, 200);
    assert.equal((await post("/approve", gm, { memberId: m.id })).status, 200);
  }
  return club;
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await Club.init();
  api = await start();
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

/* ===================== CREATE ===================== */

test("only Game Masters can create a club, with a name, and only one each", async () => {
  const player = await registerUser("cplayer@example.com");
  assert.equal((await post("/create", player, { clubName: "Nope" })).status, 403);

  const gm = await registerGm("cgm@example.com");
  for (const body of [{}, { clubName: "" }, { clubName: "x".repeat(61) }, { clubName: 5 }]) {
    assert.equal((await post("/create", gm, body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await post("/create", gm, { clubName: "ok", bio: "x".repeat(301) })).status, 400);
  assert.equal((await post("/create", gm, { clubName: "ok", discord: "not a url" })).status, 400);

  const res = await post("/create", gm, {
    clubName: " Real Club ",
    bio: "We play on Sundays",
    discord: "https://discord.gg/abc",
  });
  assert.equal(res.status, 200);
  const club = await json(res);
  assert.equal(club.clubName, "Real Club");
  assert.equal(club.bio, "We play on Sundays");

  // A second club for the same GM is refused.
  assert.equal((await post("/create", gm, { clubName: "Another" })).status, 400);
  assert.equal(await Club.countDocuments({ gm: gm.id }), 1);
});

test("GET /me describes my club by role, and is empty without one", async () => {
  const gm = await registerGm("vgm@example.com");
  const member = await registerUser("vmember@example.com");
  const stranger = await registerUser("vstranger@example.com");

  assert.deepEqual(await view(stranger), { club: null, myRole: null });

  const club = await makeClub(gm, [member], "View Club");

  const asGm = await view(gm);
  assert.equal(asGm.myRole, "gm");
  assert.equal(asGm.club.code, club.clubCode);
  assert.deepEqual(asGm.members.map((m) => m.role), ["gm", "member"]);
  assert.deepEqual(asGm.pending, []);
  assert.deepEqual(asGm.banned, []);

  const asMember = await view(member);
  assert.equal(asMember.myRole, "member");
  assert.equal(asMember.members.length, 2);
  assert.equal(asMember.pending, undefined, "members do not see requests");
  assert.equal(asMember.banned, undefined, "members do not see the banned list");
});

/* ===================== JOIN ===================== */

test("joining: pending players see only the club name, and cannot join twice", async () => {
  const gm = await registerGm("jgm@example.com");
  const other = await registerGm("jgm2@example.com");
  const p = await registerUser("jplayer@example.com");

  const club = await makeClub(gm, [], "Join Club");
  const club2 = await makeClub(other, [], "Other Club");

  let res = await post("/join", p, { clubCode: club.clubCode.toLowerCase() });
  assert.equal(res.status, 200);
  assert.equal((await json(res)).clubName, "Join Club");

  // Pending view: name only, no roster.
  const pending = await view(p);
  assert.equal(pending.myRole, "pending");
  assert.equal(pending.club.name, "Join Club");
  assert.equal(pending.members, undefined);

  // The roster endpoint also stays closed to pending players.
  assert.deepEqual(await json(await api.get("/api/club/members", bearer(p.token))), []);

  // No second request while one is pending, and the first club has no stale data.
  res = await post("/join", p, { clubCode: club2.clubCode });
  assert.equal(res.status, 400);
  assert.match((await json(res)).message, /pending request/);
  assert.equal(
    (await Club.findOne({ clubCode: club2.clubCode })).pendingMembers.length,
    0
  );

  // The GM sees the request.
  const asGm = await view(gm);
  assert.deepEqual(asGm.pending.map((x) => String(x.id)), [String(p.id)]);
});

test("a member cannot join another club without leaving first", async () => {
  const gm = await registerGm("mgm@example.com");
  const gm2 = await registerGm("mgm2@example.com");
  const p = await registerUser("mplayer@example.com");

  await makeClub(gm, [p], "First");
  const second = await makeClub(gm2, [], "Second");

  const res = await post("/join", p, { clubCode: second.clubCode });
  assert.equal(res.status, 400);
  assert.match((await json(res)).message, /Leave your current club/);

  assert.equal((await post("/leave", p)).status, 200);
  assert.equal((await post("/join", p, { clubCode: second.clubCode })).status, 200);
});

/* ===================== APPROVE / DECLINE / CANCEL ===================== */

test("the GM can approve or decline requests, and a player can cancel their own", async () => {
  const gm = await registerGm("agm@example.com");
  const a = await registerUser("aplayer1@example.com");
  const b = await registerUser("aplayer2@example.com");
  const c = await registerUser("aplayer3@example.com");
  const club = await makeClub(gm, []);

  for (const p of [a, b, c]) await post("/join", p, { clubCode: club.clubCode });

  assert.equal((await post("/approve", gm, { memberId: a.id })).status, 200);
  assert.equal((await view(a)).myRole, "member");

  assert.equal((await post("/decline", gm, { memberId: b.id })).status, 200);
  assert.deepEqual(await view(b), { club: null, myRole: null });
  // Declined players are free to ask again or go elsewhere.
  assert.equal((await post("/join", b, { clubCode: club.clubCode })).status, 200);

  // Declining someone who never asked, or approving a member, is a 404.
  assert.equal((await post("/decline", gm, { memberId: a.id })).status, 404);
  assert.equal((await post("/approve", gm, { memberId: a.id })).status, 404);

  // Cancelling a request is just leaving while pending.
  const res = await post("/leave", c);
  assert.equal(res.status, 200);
  assert.match((await json(res)).message, /cancelled/i);
  const updated = await Club.findOne({ clubCode: club.clubCode });
  assert.ok(!updated.pendingMembers.map(String).includes(String(c.id)));
  assert.equal((await User.findById(c.id)).clubCode, null);
});

/* ===================== MODERATORS ===================== */

test("moderators can approve and remove ordinary members, but not the GM or each other", async () => {
  const gm = await registerGm("modgm@example.com");
  const m1 = await registerUser("mod1@example.com");
  const m2 = await registerUser("mod2@example.com");
  const m3 = await registerUser("mod3@example.com");
  const applicant = await registerUser("modapplicant@example.com");
  const club = await makeClub(gm, [m1, m2, m3]);

  // Only the GM can appoint; a plain member cannot.
  assert.equal((await post("/assign-moderator", m3, { memberId: m1.id })).status, 403);
  assert.equal((await post("/assign-moderator", gm, { memberId: m1.id })).status, 200);
  assert.equal((await post("/assign-moderator", gm, { memberId: m2.id })).status, 200);
  assert.equal((await post("/assign-moderator", gm, { memberId: applicant.id })).status, 404);
  assert.equal((await post("/assign-moderator", gm, { memberId: gm.id })).status, 400);
  assert.equal((await view(m1)).myRole, "moderator");

  // A moderator can approve a request and see the pending list.
  await post("/join", applicant, { clubCode: club.clubCode });
  assert.deepEqual((await view(m1)).pending.map((x) => String(x.id)), [String(applicant.id)]);
  assert.equal((await post("/approve", m1, { memberId: applicant.id })).status, 200);

  // ...and remove an ordinary member,
  assert.equal((await post("/kick", m1, { memberId: m3.id })).status, 200);
  // but not the GM, another moderator, or themselves.
  assert.equal((await post("/kick", m1, { memberId: gm.id })).status, 400);
  assert.equal((await post("/kick", m1, { memberId: m2.id })).status, 403);
  assert.equal((await post("/ban", m1, { memberId: m2.id })).status, 403);
  assert.equal((await post("/kick", m1, { memberId: m1.id })).status, 400);

  // Moderators cannot manage moderators, edit or delete the club.
  assert.equal((await post("/assign-moderator", m1, { memberId: applicant.id })).status, 403);
  assert.equal((await post("/remove-moderator", m1, { memberId: m2.id })).status, 403);
  assert.equal((await patch("/me", m1, { bio: "hacked" })).status, 403);
  assert.equal((await del("/me", m1)).status, 403);

  // The GM can demote, and the demoted player loses moderation rights.
  assert.equal((await post("/remove-moderator", gm, { memberId: m1.id })).status, 200);
  assert.equal((await post("/remove-moderator", gm, { memberId: m1.id })).status, 404);
  assert.equal((await post("/kick", m1, { memberId: applicant.id })).status, 403);
  assert.equal((await view(m1)).myRole, "member");
});

/* ===================== BAN / UNBAN ===================== */

test("a banned player is out and blocked until the GM unbans them", async () => {
  const gm = await registerGm("bgm@example.com");
  const p = await registerUser("bplayer@example.com");
  const club = await makeClub(gm, [p]);

  assert.equal((await post("/ban", gm, { memberId: p.id })).status, 200);
  assert.deepEqual(await view(p), { club: null, myRole: null });
  assert.equal((await post("/join", p, { clubCode: club.clubCode })).status, 403);

  const banned = (await view(gm)).banned;
  assert.deepEqual(banned.map((x) => String(x.id)), [String(p.id)]);

  assert.equal((await post("/unban", gm, { memberId: p.id })).status, 200);
  assert.equal((await post("/unban", gm, { memberId: p.id })).status, 404);
  assert.equal((await view(gm)).banned.length, 0);
  assert.equal((await post("/join", p, { clubCode: club.clubCode })).status, 200);
});

/* ===================== LEAVE / EDIT / DELETE ===================== */

test("members and moderators can leave, the GM cannot, and both leave routes agree", async () => {
  const gm = await registerGm("lgm@example.com");
  const mod = await registerUser("lmod@example.com");
  const member = await registerUser("lmember@example.com");
  await makeClub(gm, [mod, member]);
  await post("/assign-moderator", gm, { memberId: mod.id });

  assert.equal((await post("/leave", gm)).status, 400);
  assert.equal((await post("/leave", mod)).status, 200);
  // The older profile route still works and uses the same logic.
  assert.equal(
    (await api.post("/api/profile/leave-club", {}, bearer(member.token))).status,
    200
  );
  assert.equal((await api.post("/api/profile/leave-club", {}, bearer(member.token))).status, 400);

  const asGm = await view(gm);
  assert.deepEqual(asGm.members.map((m) => m.role), ["gm"]);
  assert.equal(asGm.club.totalMembers, 1);
  const stored = await Club.findOne({ gm: gm.id });
  assert.equal(stored.moderators.length, 0, "the moderator entry is gone too");
});

test("the GM can edit the club info", async () => {
  const gm = await registerGm("egm@example.com");
  const member = await registerUser("emember@example.com");
  await makeClub(gm, [member], "Before");

  assert.equal((await patch("/me", member, { bio: "nope" })).status, 403);
  assert.equal((await patch("/me", gm, { clubName: "" })).status, 400);
  assert.equal((await patch("/me", gm, { discord: "javascript:alert(1)" })).status, 400);

  const res = await patch("/me", gm, { clubName: "After", bio: "New bio", discord: "" });
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.club.name, "After");
  assert.equal(body.club.bio, "New bio");
  // A partial edit keeps everything else.
  await patch("/me", gm, { bio: "Only bio" });
  assert.equal((await view(gm)).club.name, "After");
});

test("deleting a club frees every member and pending player", async () => {
  const gm = await registerGm("dgm@example.com");
  const member = await registerUser("dmember@example.com");
  const pending = await registerUser("dpending@example.com");
  const club = await makeClub(gm, [member]);
  await post("/join", pending, { clubCode: club.clubCode });

  assert.equal((await del("/me", member)).status, 403);
  assert.equal((await del("/me", gm)).status, 200);

  assert.equal(await Club.countDocuments({ clubCode: club.clubCode }), 0);
  for (const u of [gm, member, pending]) {
    assert.deepEqual(await view(u), { club: null, myRole: null });
    const doc = await User.findById(u.id);
    assert.equal(doc.clubCode, null);
    assert.equal(doc.clubApproved, false);
  }

  // Everyone can now start over, and the GM can create a fresh club.
  assert.equal((await post("/create", gm, { clubName: "Round two" })).status, 200);
});

/* ===================== CHAT LINK ===================== */

test("approved club mates become chat contacts; pending players do not", async () => {
  const gm = await registerGm("chgm@example.com");
  const member = await registerUser("chmember@example.com");
  const pending = await registerUser("chpending@example.com");
  const club = await makeClub(gm, [member]);
  await post("/join", pending, { clubCode: club.clubCode });

  const contacts = async (u) =>
    (await json(await api.get("/api/chat/contacts", bearer(u.token)))).map((c) => String(c.id));

  assert.deepEqual(await contacts(member), [String(gm.id)]);
  assert.deepEqual(await contacts(pending), []);

  await post("/approve", gm, { memberId: pending.id });
  assert.deepEqual((await contacts(pending)).sort(), [String(gm.id), String(member.id)].sort());

  // Leaving the club removes the connection again.
  await post("/leave", member);
  assert.ok(!(await contacts(pending)).includes(String(member.id)));
});
