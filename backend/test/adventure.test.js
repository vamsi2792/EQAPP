// Adventure purchases (Stripe webhook), the two codes, and redeeming them, against an
// in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");
const { sendCheckout, sign } = require("./stripe");

const User = require("../src/models/User");
const Adventure = require("../src/models/Adventure");
const AdventureAccess = require("../src/models/AdventureAccess");
const Purchase = require("../src/models/Purchase");

let mongod;
let api;
let eq1; // requires a Game Mentor
let eq2; // "Coming Soon"
let eq3; // open to anyone, does not make the buyer a Game Mentor

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

let sessionCounter = 0;
const checkout = (user, metadata, extra = {}) =>
  sendCheckout(api, {
    id: `cs_${++sessionCounter}`,
    client_reference_id: user.id,
    metadata,
    ...extra,
  });

const buyAdventure = (user, slug) => checkout(user, { kind: "adventure", adventureSlug: slug });
const accessOf = (user, adventure) =>
  AdventureAccess.findOne({ owner: user.id, adventure: adventure._id });

const enter = (me, code) => api.post("/api/adventures/enter-code", { code }, bearer(me.token));

// A Game Mentor (bought eq1) with a club, plus an approved member of it.
const makeClubWithMember = async (tag) => {
  const gm = await registerUser(`gm${tag}@example.com`);
  await checkout(gm, { kind: "membership" });
  assert.equal((await buyAdventure(gm, "eq1")).status, 200);

  let res = await api.post("/api/club/create", { clubName: `Club ${tag}` }, bearer(gm.token));
  assert.equal(res.status, 200);
  const club = await json(res);

  const member = await registerUser(`member${tag}@example.com`);
  await checkout(member, { kind: "membership" });
  res = await api.post("/api/club/join", { clubCode: club.clubCode }, bearer(member.token));
  assert.equal(res.status, 200);
  res = await api.post("/api/club/approve", { memberId: member.id }, bearer(gm.token));
  assert.equal(res.status, 200);

  return { gm, member, club };
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await AdventureAccess.init();
  await Adventure.init();
  await Purchase.init();
  api = await start();

  eq1 = await Adventure.create({
    slug: "eq1",
    title: "Adventure 1",
    subtitle: "Hudson River",
    unlocked: true,
    requiresGM: true,
    order: 1,
  });
  eq2 = await Adventure.create({
    slug: "eq2",
    title: "Adventure 2",
    subtitle: "Coming Soon",
    unlocked: false,
    order: 2,
  });
  eq3 = await Adventure.create({ slug: "eq3", title: "Adventure 3", unlocked: true, order: 3 });
  // An old sample adventure (no slug) and an unpublished one must not be listed.
  await Adventure.create({ title: "Old sample", location: { latitude: 1, longitude: 2 } });
  await Adventure.create({ slug: "hidden", title: "Hidden", isPublished: false, order: 4 });
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

/* ===================== CATALOGUE ===================== */

test("the adventure list holds only published catalogue entries, in order", async () => {
  const player = await registerUser("catplayer@example.com");
  const res = await api.get("/api/adventures", bearer(player.token));
  assert.equal(res.status, 200);
  const list = await json(res);

  assert.deepEqual(list.map((a) => a.slug), ["eq1", "eq2", "eq3"]);
  assert.equal(list[0].requiresGM, true);
  assert.equal(list[1].unlocked, false);
  assert.equal(list[2].requiresGM, false);
});

test("codes can no longer be created for free in the app", async () => {
  const user = await registerUser("freeloader@example.com");
  for (const path of ["/codes", "/purchase"]) {
    const res = await api.post(
      `/api/adventures${path}`,
      { adventureId: String(eq1._id) },
      bearer(user.token)
    );
    assert.ok([403, 404].includes(res.status), `${path} -> ${res.status}`);
  }
  assert.equal(await AdventureAccess.countDocuments({ owner: user.id }), 0);
});

/* ===================== WEBHOOK ===================== */

test("the webhook rejects a bad or missing signature, and replays", async () => {
  const user = await registerUser("badsig@example.com");
  const session = { id: "cs_bad", client_reference_id: user.id, metadata: { kind: "membership" } };

  let res = await sendCheckout(api, session, { secret: "whsec_wrong" });
  assert.equal(res.status, 400);
  res = await sendCheckout(api, session, { header: "t=1,v1=00" });
  assert.equal(res.status, 400);

  // An old timestamp is a replay and is refused even with the right secret.
  const body = JSON.stringify({ type: "checkout.session.completed", data: { object: session } });
  res = await fetch(`${api.base}/api/payments/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": sign(body, "whsec_test", 1000),
    },
    body,
  });
  assert.equal(res.status, 400);

  assert.equal((await User.findById(user.id)).membershipActive, false);
});

test("a paid membership makes the buyer a member, and is safe to repeat", async () => {
  const user = await registerUser("payer@example.com");
  assert.equal((await User.findById(user.id)).accountType, "registrant");

  const session = {
    id: "cs_member_once",
    client_reference_id: user.id,
    metadata: { kind: "membership" },
  };
  assert.equal((await sendCheckout(api, session)).status, 200);
  assert.equal((await sendCheckout(api, session)).status, 200); // Stripe retry

  const doc = await User.findById(user.id);
  assert.equal(doc.accountType, "member");
  assert.equal(doc.membershipActive, true);
  assert.equal(await Purchase.countDocuments({ sessionId: "cs_member_once" }), 1);
});

test("an unpaid session changes nothing", async () => {
  const user = await registerUser("unpaid@example.com");
  const res = await checkout(user, { kind: "membership" }, { payment_status: "unpaid" });
  assert.equal(res.status, 200);
  assert.equal((await User.findById(user.id)).membershipActive, false);
});

test("a payment with no matching account is recorded but fulfils nothing", async () => {
  const res = await sendCheckout(api, {
    id: "cs_nobody",
    customer_details: { email: "nobody@example.com" },
    metadata: { kind: "membership" },
  });
  assert.equal(res.status, 200);
  const p = await Purchase.findOne({ sessionId: "cs_nobody" });
  assert.equal(p.fulfilled, false);
});

test("a payment can be matched by email when no user id was sent", async () => {
  const user = await registerUser("byemail@example.com");
  const res = await sendCheckout(api, {
    id: "cs_byemail",
    customer_details: { email: "ByEmail@Example.com" },
    metadata: { kind: "membership" },
  });
  assert.equal(res.status, 200);
  assert.equal((await User.findById(user.id)).membershipActive, true);
});

/* ===================== BUYING ADVENTURES ===================== */

test("buying a Game Mentor adventure makes the buyer a Game Mentor with two codes", async () => {
  const buyer = await registerUser("buyer1@example.com");
  await checkout(buyer, { kind: "membership" });
  assert.equal((await buyAdventure(buyer, "eq1")).status, 200);
  assert.equal((await buyAdventure(buyer, "eq1")).status, 200); // a repeat adds nothing

  assert.equal((await User.findById(buyer.id)).accountType, "gm");
  assert.equal(await AdventureAccess.countDocuments({ owner: buyer.id, adventure: eq1._id }), 1);

  const access = await accessOf(buyer, eq1);
  assert.match(access.accessCode, /^[A-Z2-9]{6}$/);
  assert.match(access.gmCode, /^[A-Z2-9]{8}$/);
  assert.notEqual(access.accessCode, access.gmCode);

  const res = await api.get("/api/adventures/mine", bearer(buyer.token));
  const [mine] = await json(res);
  assert.equal(mine.role, "owner");
  assert.equal(mine.memberCode, access.accessCode);
  assert.equal(mine.gmCode, access.gmCode);
});

test("buying an adventure that does not require a Game Mentor leaves the buyer's role alone", async () => {
  const buyer = await registerUser("buyer3@example.com");
  await checkout(buyer, { kind: "membership" });
  assert.equal((await buyAdventure(buyer, "eq3")).status, 200);
  assert.equal((await User.findById(buyer.id)).accountType, "member");
  assert.ok(await accessOf(buyer, eq3));
});

test("an unknown adventure is recorded but nothing is granted", async () => {
  const buyer = await registerUser("buyer4@example.com");
  assert.equal((await buyAdventure(buyer, "nope")).status, 200);
  assert.equal(await AdventureAccess.countDocuments({ owner: buyer.id }), 0);
  assert.equal((await User.findById(buyer.id)).accountType, "registrant");
});

/* ===================== REDEEMING ===================== */

test("only approved members of the Game Mentor's club can use the member code", async () => {
  const { gm, member } = await makeClubWithMember("redeem");
  const access = await accessOf(gm, eq1);

  // An outsider is refused, with or without a membership.
  const outsider = await registerUser("outsider@example.com");
  await checkout(outsider, { kind: "membership" });
  let res = await enter(outsider, access.accessCode);
  assert.equal(res.status, 403);
  res = await api.get(`/api/adventures/${eq1._id}`, bearer(outsider.token));
  assert.equal(res.status, 403);

  // A club member gets in, case-insensitively, and entering twice adds nothing.
  res = await enter(member, access.accessCode.toLowerCase());
  assert.equal(res.status, 200);
  res = await enter(member, access.accessCode);
  assert.equal(res.status, 200);
  assert.equal((await AdventureAccess.findById(access._id)).players.length, 2);

  res = await api.get(`/api/adventures/${eq1._id}`, bearer(member.token));
  assert.equal(res.status, 200);

  // Players never see the codes.
  const [mine] = await json(await api.get("/api/adventures/mine", bearer(member.token)));
  assert.equal(mine.role, "player");
  assert.equal(mine.memberCode, undefined);
  assert.equal(mine.gmCode, undefined);
});

test("a member who has only asked to join the club is refused", async () => {
  const { gm, club } = await makeClubWithMember("pending");
  const pending = await registerUser("pendingp@example.com");
  await checkout(pending, { kind: "membership" });
  assert.equal(
    (await api.post("/api/club/join", { clubCode: club.clubCode }, bearer(pending.token))).status,
    200
  );
  const access = await accessOf(gm, eq1);
  assert.equal((await enter(pending, access.accessCode)).status, 403);
});

test("the Game Mentor code works only for the Game Mentor who bought the adventure", async () => {
  const { gm, member } = await makeClubWithMember("gmcode");
  const access = await accessOf(gm, eq1);

  assert.equal((await enter(member, access.gmCode)).status, 404);
  assert.equal((await enter(gm, access.gmCode)).status, 200);
});

test("operator injection and unknown codes are rejected", async () => {
  const user = await registerUser("injector@example.com");
  for (const code of [{ $ne: null }, { $gt: "" }, { $regex: ".*" }]) {
    assert.equal((await enter(user, code)).status, 400);
  }
  assert.equal((await enter(user, "ZZZZZZ")).status, 404);
});

test("a locked adventure's code cannot be redeemed", async () => {
  const gm = await registerUser("lockedgm@example.com");
  await AdventureAccess.create({
    adventure: eq2._id,
    owner: gm.id,
    accessCode: "LOCKED",
    players: [gm.id],
  });
  const res = await enter(gm, "LOCKED");
  assert.equal(res.status, 400);
});

/* ===================== OWNER CONTROLS ===================== */

test("a new member code replaces the old one but keeps the players", async () => {
  const { gm, member } = await makeClubWithMember("rotate");
  const before = await accessOf(gm, eq1);
  await enter(member, before.accessCode);

  const res = await api.post(`/api/adventures/mine/${before._id}/new-code`, {}, bearer(gm.token));
  assert.equal(res.status, 200);

  const after = await accessOf(gm, eq1);
  assert.notEqual(after.accessCode, before.accessCode);
  assert.equal(after.gmCode, before.gmCode);
  assert.equal(after.players.length, 2);

  // Only the owner may do it.
  const denied = await api.post(
    `/api/adventures/mine/${before._id}/new-code`,
    {},
    bearer(member.token)
  );
  assert.equal(denied.status, 404);
});

test("pausing stops new joins and resuming allows them again", async () => {
  const { gm, member } = await makeClubWithMember("pause");
  const access = await accessOf(gm, eq1);
  const active = (isActive) =>
    api.post(`/api/adventures/mine/${access._id}/active`, { isActive }, bearer(gm.token));

  assert.equal((await active(false)).status, 200);
  assert.equal((await enter(member, access.accessCode)).status, 404);
  assert.equal((await active(true)).status, 200);
  assert.equal((await enter(member, access.accessCode)).status, 200);
  assert.equal((await active("yes")).status, 400);
});

/* ===================== CLUB SEARCH ===================== */

test("members can find a club by name and ask to join it, without seeing its code", async () => {
  const { gm, club } = await makeClubWithMember("searchable");
  const seeker = await registerUser("seeker@example.com");
  await checkout(seeker, { kind: "membership" });

  let res = await api.get("/api/club/search?q=searchable", bearer(seeker.token));
  assert.equal(res.status, 200);
  const found = await json(res);
  assert.equal(found.length, 1);
  assert.equal(found[0].clubCode, undefined);

  assert.equal((await api.get("/api/club/search?q=a", bearer(seeker.token))).status, 400);
  // Regex characters are matched literally, not interpreted.
  assert.equal((await api.get("/api/club/search?q=.*%5B(", bearer(seeker.token))).status, 200);

  res = await api.post("/api/club/join", { clubId: found[0].id }, bearer(seeker.token));
  assert.equal(res.status, 200);
  assert.equal(String(found[0].id), String(club._id));

  // The Game Mentor approves, and the member can then use the adventure's member code.
  assert.equal(
    (await api.post("/api/club/approve", { memberId: seeker.id }, bearer(gm.token))).status,
    200
  );
  assert.equal((await enter(seeker, (await accessOf(gm, eq1)).accessCode)).status, 200);
});
