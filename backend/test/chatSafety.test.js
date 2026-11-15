// Chat safety: blocking, reporting and admin review, against an in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";
process.env.REPORT_RATE_LIMIT_MAX = "1000";
process.env.ADMIN_EMAILS = "admin@example.com";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const User = require("../src/models/User");
const Report = require("../src/models/Report");

let mongod;
let api;

const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (res) => res.json();

const registerUser = async (email, password = "password123") => {
  let res = await api.post("/api/auth/signup", {
    firstName: "Test",
    lastName: email.split("@")[0],
    username: email.split("@")[0],
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

const del = (path, headers) =>
  fetch(api.base + path, { method: "DELETE", headers });
const patch = (path, body, headers) =>
  fetch(api.base + path, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const startChat = (me, otherId) =>
  api.post("/api/chat/conversations", { userId: otherId }, bearer(me.token));
const send = (me, conversationId, text) =>
  api.post(`/api/chat/conversations/${conversationId}/messages`, { text }, bearer(me.token));
const block = (me, userId) => api.post("/api/chat/blocks", { userId }, bearer(me.token));
const report = (me, body) => api.post("/api/chat/reports", body, bearer(me.token));

let alice, bob, carol, admin;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await Report.init();
  api = await start();

  [alice, bob, carol, admin] = await Promise.all(
    ["alice", "bob", "carol", "admin"].map((n) => registerUser(`${n}@example.com`))
  );

  // alice, bob and carol are all approved members of one club.
  await User.updateMany(
    { _id: mongoose.trusted({ $in: [alice.id, bob.id, carol.id] }) },
    { clubCode: "CLUB01", clubApproved: true }
  );
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

/* ===================== BLOCKING ===================== */

test("blocking needs a login and a valid, existing, other user", async () => {
  assert.equal((await api.post("/api/chat/blocks", { userId: bob.id })).status, 401);
  assert.equal((await block(alice, alice.id)).status, 400, "self");
  assert.equal((await block(alice, "nope")).status, 400, "bad id");
  assert.equal((await block(alice, new mongoose.Types.ObjectId().toString())).status, 404);
});

test("blocking is idempotent and shows in my blocked list", async () => {
  assert.equal((await block(alice, carol.id)).status, 201);
  assert.equal((await block(alice, carol.id)).status, 201);

  const list = await json(await api.get("/api/chat/blocks", bearer(alice.token)));
  assert.deepEqual(list.map(String), [String(carol.id)]);

  // The other side's list is unaffected: they are never told.
  const theirs = await json(await api.get("/api/chat/blocks", bearer(carol.token)));
  assert.deepEqual(theirs, []);

  assert.equal((await del(`/api/chat/blocks/${carol.id}`, bearer(alice.token))).status, 200);
});

test("a block silences both directions and hides the person from contacts", async () => {
  const conv = await json(await startChat(alice, bob.id));
  assert.equal((await send(alice, conv.id, "before block")).status, 201);

  assert.equal((await block(alice, bob.id)).status, 201);

  // Neither side can send, and the refusal does not mention blocking.
  for (const who of [alice, bob]) {
    const res = await send(who, conv.id, "after block");
    assert.equal(res.status, 403);
    assert.doesNotMatch(JSON.stringify(await json(res)), /block/i);
  }

  // Neither side can start a new chat, again with a generic message.
  for (const [me, other] of [
    [alice, bob],
    [bob, alice],
  ]) {
    const res = await startChat(me, other.id);
    assert.equal(res.status, 403);
    assert.doesNotMatch(JSON.stringify(await json(res)), /block/i);
  }

  // Contacts hide each other (but still list carol).
  for (const [me, hidden] of [
    [alice, bob],
    [bob, alice],
  ]) {
    const ids = (await json(await api.get("/api/chat/contacts", bearer(me.token)))).map((c) =>
      String(c.id)
    );
    assert.ok(!ids.includes(String(hidden.id)));
    assert.ok(ids.includes(String(carol.id)));
  }

  // History stays readable for both.
  for (const who of [alice, bob]) {
    const res = await api.get(`/api/chat/conversations/${conv.id}/messages`, bearer(who.token));
    assert.equal(res.status, 200);
    assert.equal((await json(res))[0].text, "before block");
  }

  // Unblocking restores everything.
  assert.equal((await del(`/api/chat/blocks/${bob.id}`, bearer(alice.token))).status, 200);
  assert.equal((await send(bob, conv.id, "back again")).status, 201);
});

test("only the blocker's own block is removed by unblock", async () => {
  await block(alice, bob.id);
  // bob "unblocking" alice does nothing: bob never blocked alice.
  await del(`/api/chat/blocks/${alice.id}`, bearer(bob.token));

  const conv = await json(await startChat(carol, alice.id));
  assert.equal((await send(carol, conv.id, "hi alice")).status, 201);

  const res = await startChat(bob, alice.id);
  assert.equal(res.status, 403, "block still in force");

  await del(`/api/chat/blocks/${bob.id}`, bearer(alice.token));
});

/* ===================== REPORTS ===================== */

// Builds a conversation between carol and bob with 8 numbered messages; returns the ids.
const seedConversation = async () => {
  const conv = await json(await startChat(bob, carol.id));
  const ids = [];
  for (let i = 1; i <= 8; i++) {
    const res = await send(i % 2 ? carol : bob, conv.id, `m${i}`);
    assert.equal(res.status, 201);
    ids.push((await json(res)).id);
  }
  return { conv, ids };
};

test("a report stores the reported message with the messages around it", async () => {
  const { ids } = await seedConversation();

  // bob reports m5 (sent by carol): expect 4 before, itself, 2 after.
  const res = await report(bob, { messageId: ids[4], reason: "harassment", note: " rude " });
  assert.equal(res.status, 201);

  const saved = await Report.findOne({ message: ids[4] });
  assert.equal(String(saved.reported), String(carol.id));
  assert.equal(saved.note, "rude");
  assert.deepEqual(
    saved.context.map((c) => c.text),
    ["m1", "m2", "m3", "m4", "m5", "m6", "m7"]
  );
  assert.deepEqual(
    saved.context.filter((c) => c.reported).map((c) => c.text),
    ["m5"]
  );
});

test("the same message can only be reported once per person", async () => {
  const { ids } = await seedConversation();

  assert.equal((await report(bob, { messageId: ids[0], reason: "spam" })).status, 201);
  assert.equal((await report(bob, { messageId: ids[0], reason: "spam" })).status, 200);
  assert.equal(await Report.countDocuments({ message: ids[0] }), 1);
});

test("report input and ownership are validated", async () => {
  const { ids } = await seedConversation();

  assert.equal((await report(bob, { messageId: ids[0], reason: "nope" })).status, 400);
  assert.equal((await report(bob, { messageId: ids[0] })).status, 400);
  assert.equal(
    (await report(bob, { messageId: ids[0], reason: "spam", note: "x".repeat(501) })).status,
    400
  );
  assert.equal((await report(bob, { messageId: "bad", reason: "spam" })).status, 400);

  // ids[1] was sent by bob himself.
  assert.equal((await report(bob, { messageId: ids[1], reason: "spam" })).status, 400);

  // alice is not in the bob/carol conversation, and unknown ids look the same.
  assert.equal((await report(alice, { messageId: ids[0], reason: "spam" })).status, 404);
  assert.equal(
    (await report(bob, { messageId: new mongoose.Types.ObjectId().toString(), reason: "spam" }))
      .status,
    404
  );
  assert.equal((await api.post("/api/chat/reports", { messageId: ids[0], reason: "spam" })).status, 401);
});

/* ===================== ADMIN REVIEW ===================== */

test("only admins can list or resolve reports", async () => {
  const { ids } = await seedConversation();
  await report(bob, { messageId: ids[2], reason: "inappropriate", note: "see context" });

  assert.equal((await api.get("/api/chat/admin/reports", bearer(bob.token))).status, 403);
  assert.equal((await api.get("/api/chat/admin/reports")).status, 401);

  const open = await json(await api.get("/api/chat/admin/reports", bearer(admin.token)));
  const mine = open.find((r) => r.reason === "inappropriate" && r.note === "see context");
  assert.ok(mine, "admin sees the report");
  assert.equal(mine.reported.name, "Test carol");
  assert.equal(mine.reporter.name, "Test bob");
  assert.ok(mine.context.some((c) => c.reported && c.text === "m3"));

  assert.equal((await patch(`/api/chat/admin/reports/${mine.id}`, { status: "resolved" }, bearer(bob.token))).status, 403);
  assert.equal((await patch(`/api/chat/admin/reports/${mine.id}`, { status: "open" }, bearer(admin.token))).status, 400);
  assert.equal((await patch(`/api/chat/admin/reports/nope`, { status: "resolved" }, bearer(admin.token))).status, 400);

  const res = await patch(`/api/chat/admin/reports/${mine.id}`, { status: "resolved" }, bearer(admin.token));
  assert.equal(res.status, 200);
  assert.equal((await json(res)).status, "resolved");

  const stillOpen = await json(await api.get("/api/chat/admin/reports", bearer(admin.token)));
  assert.ok(!stillOpen.some((r) => r.id === mine.id));

  const resolved = await json(
    await api.get("/api/chat/admin/reports?status=resolved", bearer(admin.token))
  );
  assert.ok(resolved.some((r) => r.id === mine.id));

  assert.equal((await api.get("/api/chat/admin/reports?status=bogus", bearer(admin.token))).status, 400);
});
