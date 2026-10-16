// End-to-end API tests against an in-memory MongoDB (downloaded on first run).
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const User = require("../src/models/User");
const Adventure = require("../src/models/Adventure");

let mongod;
let api;

const ADMIN = { "x-admin-key": "test-admin-key" };
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (res) => res.json();

// Full signup -> verify -> login; returns { id, token }.
const registerUser = async (email, password = "password123") => {
  let res = await api.post("/api/auth/signup", {
    firstName: "Test",
    lastName: email.split("@")[0],
    email,
    password,
  });
  assert.equal(res.status, 201, "signup");

  res = await api.post("/api/auth/verify-email", { email, otp: lastOtpFor(email) });
  assert.equal(res.status, 200, "verify");

  res = await api.post("/api/auth/login", { email, password });
  assert.equal(res.status, 200, "login");
  const body = await json(res);
  return { id: body.user.id, token: body.token };
};

// A registered user promoted to GM through the admin endpoints.
const registerGm = async (email) => {
  const u = await registerUser(email);
  let res = await api.post("/api/auth/upgrade-member", { userId: u.id }, ADMIN);
  assert.equal(res.status, 200);
  res = await api.post("/api/auth/upgrade-gm", { userId: u.id }, ADMIN);
  assert.equal(res.status, 200);
  return u;
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  api = await start();
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test("signup -> verify -> login works, and unverified users cannot log in", async () => {
  const email = "flow@example.com";
  let res = await api.post("/api/auth/signup", {
    firstName: "F",
    lastName: "L",
    email,
    password: "password123",
  });
  assert.equal(res.status, 201);

  // Not verified yet.
  res = await api.post("/api/auth/login", { email, password: "password123" });
  assert.equal(res.status, 403);

  // Duplicate signup rejected.
  res = await api.post("/api/auth/signup", {
    firstName: "F",
    lastName: "L",
    email,
    password: "password123",
  });
  assert.equal(res.status, 400);

  res = await api.post("/api/auth/verify-email", { email, otp: lastOtpFor(email) });
  assert.equal(res.status, 200);

  res = await api.post("/api/auth/login", { email, password: "wrong-password" });
  assert.equal(res.status, 401);

  res = await api.post("/api/auth/login", { email, password: "password123" });
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.ok(body.token);
  assert.equal(body.user.accountType, "registrant");

  res = await api.get("/api/auth/me", bearer(body.token));
  assert.equal(res.status, 200);
  assert.equal((await json(res)).password, undefined);

  // Stored OTP/password are never plaintext.
  const stored = await User.findOne({ email });
  assert.notEqual(stored.password, "password123");
});

test("OTP locks after 5 wrong guesses, even if the correct code is then supplied", async () => {
  const email = "lockout@example.com";
  await api.post("/api/auth/signup", {
    firstName: "L",
    lastName: "O",
    email,
    password: "password123",
  });
  const correct = lastOtpFor(email);
  const wrong = correct === "000000" ? "111111" : "000000";

  for (let i = 0; i < 5; i++) {
    const res = await api.post("/api/auth/verify-email", { email, otp: wrong });
    assert.equal(res.status, 400);
  }
  const res = await api.post("/api/auth/verify-email", { email, otp: correct });
  assert.equal(res.status, 400);
  assert.equal((await User.findOne({ email })).emailVerified, false);

  // Requesting a new OTP resets the counter.
  await api.post("/api/auth/resend-otp", { email });
  const ok = await api.post("/api/auth/verify-email", { email, otp: lastOtpFor(email) });
  assert.equal(ok.status, 200);
});

test("forgot-password does not reveal whether an email exists", async () => {
  const known = await registerUser("known@example.com");
  assert.ok(known.token);

  const a = await api.post("/api/auth/forgot-password", { email: "known@example.com" });
  const b = await api.post("/api/auth/forgot-password", { email: "nobody@example.com" });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.deepEqual(await json(a), await json(b));
});

test("password reset works and revokes tokens issued before it", async () => {
  const email = "reset@example.com";
  const { token } = await registerUser(email);
  assert.equal((await api.get("/api/auth/me", bearer(token))).status, 200);

  await api.post("/api/auth/forgot-password", { email });
  const otp = lastOtpFor(email);

  // Wrong OTP and weak password are both refused.
  let res = await api.post("/api/auth/reset-password", {
    email,
    otp: otp === "000000" ? "111111" : "000000",
    newPassword: "newpassword123",
  });
  assert.equal(res.status, 400);
  res = await api.post("/api/auth/reset-password", { email, otp, newPassword: "short" });
  assert.equal(res.status, 400);

  res = await api.post("/api/auth/reset-password", {
    email,
    otp,
    newPassword: "newpassword123",
  });
  assert.equal(res.status, 200);

  // OTP is single-use.
  res = await api.post("/api/auth/reset-password", {
    email,
    otp,
    newPassword: "anotherpassword1",
  });
  assert.equal(res.status, 400);

  // The old session is dead; the old password no longer works; the new one does.
  assert.equal((await api.get("/api/auth/me", bearer(token))).status, 401);
  assert.equal(
    (await api.post("/api/auth/login", { email, password: "password123" })).status,
    401
  );
  assert.equal(
    (await api.post("/api/auth/login", { email, password: "newpassword123" })).status,
    200
  );
});

test("logout-all revokes existing tokens", async () => {
  const { token } = await registerUser("logout@example.com");
  assert.equal((await api.post("/api/auth/logout-all", {}, bearer(token))).status, 200);
  assert.equal((await api.get("/api/auth/me", bearer(token))).status, 401);
});

test("a deleted account's token stops working", async () => {
  const { id, token } = await registerUser("deleted@example.com");
  await User.deleteOne({ _id: id });
  assert.equal((await api.get("/api/auth/me", bearer(token))).status, 401);
});

test("members can no longer self-promote; admin promotion unlocks club creation", async () => {
  const u = await registerUser("promo@example.com");

  // A logged-in user cannot promote themselves.
  for (const path of ["/api/auth/upgrade-member", "/api/auth/upgrade-gm"]) {
    const res = await api.post(path, { userId: u.id }, bearer(u.token));
    assert.equal(res.status, 403);
  }
  // A registrant cannot create a club.
  let res = await api.post("/api/club/create", { clubName: "Nope" }, bearer(u.token));
  assert.equal(res.status, 403);

  // Only members may become GMs.
  res = await api.post("/api/auth/upgrade-gm", { userId: u.id }, ADMIN);
  assert.equal(res.status, 400);

  res = await api.post("/api/auth/upgrade-member", { userId: u.id }, ADMIN);
  assert.equal(res.status, 200);
  assert.equal((await json(res)).accountType, "member");
  res = await api.post("/api/auth/upgrade-gm", { userId: u.id }, ADMIN);
  assert.equal(res.status, 200);
  assert.equal((await json(res)).permissions.canCreateClub, true);

  res = await api.post("/api/club/create", { clubName: "Real Club" }, bearer(u.token));
  assert.equal(res.status, 200);
  const club = await json(res);
  assert.match(club.clubCode, /^[A-Z2-9]{6}$/);
});

test("club join / approve / kick / ban respect club boundaries", async () => {
  const gmA = await registerGm("gma@example.com");
  const gmB = await registerGm("gmb@example.com");
  const alice = await registerUser("alice@example.com");
  const bob = await registerUser("bob@example.com");

  const clubA = await json(
    await api.post("/api/club/create", { clubName: "A" }, bearer(gmA.token))
  );
  const clubB = await json(
    await api.post("/api/club/create", { clubName: "B" }, bearer(gmB.token))
  );

  // Alice requests to join A (code is case-insensitive); Bob joins B.
  let res = await api.post(
    "/api/club/join",
    { clubCode: clubA.clubCode.toLowerCase() },
    bearer(alice.token)
  );
  assert.equal(res.status, 200);
  await api.post("/api/club/join", { clubCode: clubB.clubCode }, bearer(bob.token));
  await api.post(
    "/api/club/approve",
    { memberId: bob.id },
    bearer(gmB.token)
  );

  // GM A cannot approve someone who never asked to join A (Bob is in B).
  res = await api.post("/api/club/approve", { memberId: bob.id }, bearer(gmA.token));
  assert.equal(res.status, 404);

  // Garbage ids are rejected.
  res = await api.post("/api/club/approve", { memberId: { $ne: null } }, bearer(gmA.token));
  assert.equal(res.status, 400);
  res = await api.post("/api/club/approve", { memberId: "nope" }, bearer(gmA.token));
  assert.equal(res.status, 400);

  // Proper approval.
  res = await api.post("/api/club/approve", { memberId: alice.id }, bearer(gmA.token));
  assert.equal(res.status, 200);
  let aliceDoc = await User.findById(alice.id);
  assert.equal(aliceDoc.clubCode, clubA.clubCode);
  assert.equal(aliceDoc.clubApproved, true);

  // GM A cannot kick or ban Bob (member of B): Bob is untouched.
  for (const path of ["/api/club/kick", "/api/club/ban"]) {
    res = await api.post(path, { memberId: bob.id }, bearer(gmA.token));
    assert.equal(res.status, 404, path);
  }
  const bobDoc = await User.findById(bob.id);
  assert.equal(bobDoc.clubCode, clubB.clubCode);
  assert.equal(bobDoc.clubApproved, true);

  // The GM cannot be removed.
  res = await api.post("/api/club/kick", { memberId: gmA.id }, bearer(gmA.token));
  assert.equal(res.status, 400);

  // Ban Alice: she is removed and cannot rejoin.
  res = await api.post("/api/club/ban", { memberId: alice.id }, bearer(gmA.token));
  assert.equal(res.status, 200);
  aliceDoc = await User.findById(alice.id);
  assert.equal(aliceDoc.clubCode, null);
  res = await api.post("/api/club/join", { clubCode: clubA.clubCode }, bearer(alice.token));
  assert.equal(res.status, 403);

  // Non-GMs cannot moderate at all.
  res = await api.post("/api/club/kick", { memberId: bob.id }, bearer(alice.token));
  assert.equal(res.status, 403);

  // Injection attempt in the join code is treated as a literal and rejected.
  res = await api.post("/api/club/join", { clubCode: { $ne: null } }, bearer(bob.token));
  assert.equal(res.status, 400);
});

test("adventure access codes cannot be guessed with query operators", async () => {
  const adventure = await Adventure.create({
    title: "Test Adventure",
    isPublished: true,
    location: { latitude: 1, longitude: 2 },
  });
  const owner = await registerUser("owner@example.com");
  const stranger = await registerUser("stranger@example.com");

  let res = await api.post(
    "/api/adventures/purchase",
    { adventureId: String(adventure._id) },
    bearer(owner.token)
  );
  assert.equal(res.status, 200);
  const { accessCode } = await json(res);
  assert.match(accessCode, /^[A-Z2-9]{6}$/);

  // Operator injection no longer matches someone else's code.
  for (const code of [{ $ne: null }, { $gt: "" }, { $regex: ".*" }]) {
    res = await api.post("/api/adventures/enter-code", { code }, bearer(stranger.token));
    assert.equal(res.status, 400);
  }
  res = await api.post("/api/adventures/enter-code", { code: "ZZZZZZ" }, bearer(stranger.token));
  assert.equal(res.status, 404);

  // No access before redeeming the real code.
  res = await api.get(`/api/adventures/${adventure._id}`, bearer(stranger.token));
  assert.equal(res.status, 403);

  res = await api.post(
    "/api/adventures/enter-code",
    { code: accessCode.toLowerCase() },
    bearer(stranger.token)
  );
  assert.equal(res.status, 200);
  res = await api.get(`/api/adventures/${adventure._id}`, bearer(stranger.token));
  assert.equal(res.status, 200);

  // Only the owner can deactivate a code.
  res = await api.post("/api/adventures/deactivate", { accessCode }, bearer(stranger.token));
  assert.equal(res.status, 403);
  res = await api.post("/api/adventures/deactivate", { accessCode }, bearer(owner.token));
  assert.equal(res.status, 200);

  // Malformed ids are a 400, not a server error.
  res = await api.get("/api/adventures/not-an-id", bearer(owner.token));
  assert.equal(res.status, 400);
});

test("SU score validates answers and persists a valid submission", async () => {
  const u = await registerUser("score@example.com");

  let res = await fetch(`${api.base}/api/profile/su-score`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(u.token) },
    body: JSON.stringify({ answers: { food_1: 9 } }),
  });
  assert.equal(res.status, 400);

  const categories = [
    "food", "housing", "transportation", "energy", "landUseBiodiversity", "waterUse",
    "ancestorsLifestyle", "contaminantsToxics", "consumptionWaste", "climateActions",
    "healthWellness", "communityParticipation",
  ];
  const answers = {};
  for (const c of categories) for (let i = 1; i <= 3; i++) answers[`${c}_${i}`] = 4;

  res = await fetch(`${api.base}/api/profile/su-score`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(u.token) },
    body: JSON.stringify({ answers }),
  });
  assert.equal(res.status, 200);
  assert.equal((await json(res)).suScore.totalScore, 48);

  res = await api.get("/api/profile/full", bearer(u.token));
  assert.equal((await json(res)).user.suScore.totalScore, 48);
});
