// Usernames and profile editing, against an in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const User = require("../src/models/User");

let mongod;
let api;

const ADMIN = { "x-admin-key": "test-admin-key" };
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (res) => res.json();

const signup = (email, username, extra = {}) =>
  api.post("/api/auth/signup", {
    firstName: "Test",
    lastName: "User",
    email,
    username,
    password: "password123",
    ...extra,
  });

const registerUser = async (email, username, extra) => {
  let res = await signup(email, username, extra);
  assert.equal(res.status, 201, "signup");
  res = await api.post("/api/auth/verify-email", { email, otp: lastOtpFor(email) });
  assert.equal(res.status, 200, "verify");
  res = await api.post("/api/auth/login", { email, password: "password123" });
  const body = await json(res);
  return { id: body.user.id, token: body.token, user: body.user };
};

const put = (path, body, headers) =>
  fetch(api.base + path, {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

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

/* ===================== SIGNUP ===================== */

test("signup requires a valid username and says what the rules are", async () => {
  const bad = [undefined, "", "ab", "a".repeat(21), "has space", "dash-ed", "emoji😀x", 123, { $ne: 1 }];

  for (const username of bad) {
    const res = await signup("rules@example.com", username);
    assert.equal(res.status, 400, `username ${JSON.stringify(username)}`);
    assert.match((await json(res)).message, /3-20 characters/);
  }

  // None of the failed attempts created an account.
  assert.equal(await User.countDocuments({ email: "rules@example.com" }), 0);
});

test("usernames are stored lowercase and unique regardless of case", async () => {
  assert.equal((await signup("first@example.com", "Alex_One")).status, 201);

  const user = await User.findOne({ email: "first@example.com" });
  assert.equal(user.username, "alex_one");

  for (const clash of ["alex_one", "ALEX_ONE", " Alex_One "]) {
    const res = await signup("second@example.com", clash);
    assert.equal(res.status, 400, clash);
    assert.equal((await json(res)).message, "Username already taken");
  }
  assert.equal(await User.countDocuments({ email: "second@example.com" }), 0);
});

/* ===================== SET USERNAME ===================== */

test("a logged-in user can change their username, but not to a taken or invalid one", async () => {
  const a = await registerUser("sa@example.com", "sam_a");
  await registerUser("sb@example.com", "sam_b");

  let res = await api.post("/api/auth/set-username", { username: "sam_b" }, bearer(a.token));
  assert.equal(res.status, 400);
  assert.equal((await json(res)).message, "Username already taken");

  res = await api.post("/api/auth/set-username", { username: "x" }, bearer(a.token));
  assert.equal(res.status, 400);

  res = await api.post("/api/auth/set-username", { username: "Sam_New" }, bearer(a.token));
  assert.equal(res.status, 200);
  assert.equal((await json(res)).username, "sam_new");

  // Keeping your current name (even in another case) is not a clash with yourself.
  res = await api.post("/api/auth/set-username", { username: "SAM_NEW" }, bearer(a.token));
  assert.equal(res.status, 200);
});

test("upgrading to member or GM no longer changes the username", async () => {
  const u = await registerUser("up@example.com", "upgrader");

  assert.equal((await api.post("/api/auth/upgrade-member", { userId: u.id }, ADMIN)).status, 200);
  assert.equal((await api.post("/api/auth/upgrade-gm", { userId: u.id }, ADMIN)).status, 200);

  const me = await json(await api.get("/api/auth/me", bearer(u.token)));
  assert.equal(me.username, "upgrader");
  assert.equal(me.accountType, "gm");
});

/* ===================== PROFILE ===================== */

test("the full profile returns the real account, without secrets", async () => {
  const u = await registerUser("real@example.com", "real_one", {
    firstName: "Rae",
    lastName: "Lopez",
    profile: { age: "30", location: "Canada" },
  });

  const res = await api.get("/api/profile/full", bearer(u.token));
  assert.equal(res.status, 200);
  const { user } = await json(res);

  assert.equal(user.firstName, "Rae");
  assert.equal(user.lastName, "Lopez");
  assert.equal(user.username, "real_one");
  assert.equal(user.email, "real@example.com");
  assert.equal(user.accountType, "registrant");
  assert.equal(user.profile.location, "Canada");
  assert.equal(user.password, undefined);
  assert.equal(user.emailOtp, undefined);
  assert.equal(user.tokenVersion, undefined);
});

test("profile update changes names, username and only the profile fields sent", async () => {
  const u = await registerUser("edit@example.com", "editor", {
    profile: { age: "25", gender: "F", location: "Canada" },
  });

  const res = await put(
    "/api/profile/update",
    {
      firstName: "  New ",
      username: "Editor_2",
      profile: { location: "Norway", discord: "me#1", aboutMe: "hello", unknownKey: "ignored" },
    },
    bearer(u.token)
  );
  assert.equal(res.status, 200);
  const { user } = await json(res);

  assert.equal(user.firstName, "New");
  assert.equal(user.lastName, "User", "unsent names are kept");
  assert.equal(user.username, "editor_2");
  assert.equal(user.profile.location, "Norway");
  assert.equal(user.profile.discord, "me#1");
  assert.equal(user.profile.aboutMe, "hello");
  assert.equal(user.profile.age, "25", "other profile fields are not wiped");
  assert.equal(user.profile.gender, "F");
  assert.equal(user.profile.unknownKey, undefined);
  assert.equal(user.password, undefined);

  // It persisted.
  const again = await json(await api.get("/api/profile/full", bearer(u.token)));
  assert.equal(again.user.profile.location, "Norway");
});

test("profile update rejects bad input without changing anything", async () => {
  const u = await registerUser("bad@example.com", "badinput");
  await registerUser("taken@example.com", "takenname");

  const cases = [
    [{ firstName: "" }, /firstName/],
    [{ firstName: "x".repeat(51) }, /firstName/],
    [{ lastName: 5 }, /lastName/],
    [{ username: "takenname" }, /already taken/],
    [{ username: "no good" }, /3-20 characters/],
    [{ profile: "nope" }, /profile/],
    [{ profile: { aboutMe: "x".repeat(301) } }, /aboutMe/],
    [{ profile: { age: 30 } }, /age/],
    // a valid change alongside a bad one must not be applied
    [{ firstName: "Changed", username: "takenname" }, /already taken/],
  ];

  for (const [body, pattern] of cases) {
    const res = await put("/api/profile/update", body, bearer(u.token));
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match((await json(res)).message, pattern);
  }

  const user = await User.findById(u.id);
  assert.equal(user.firstName, "Test");
  assert.equal(user.username, "badinput");

  assert.equal((await put("/api/profile/update", {}, {})).status, 401);
});
