// Player chat: eligibility, history and live delivery, against an in-memory MongoDB.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { io: connectClient } = require("socket.io-client");

const { lastOtpFor } = require("./mockEmail");
const { start } = require("./helpers");

const app = require("../src/app");
const { attachSocket } = require("../src/socket");
const User = require("../src/models/User");
const AdventureAccess = require("../src/models/AdventureAccess");

let mongod;
let api;
let socketServer;
let socketUrl;
const openSockets = [];

const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (res) => res.json();

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

const startChat = (me, otherId) =>
  api.post("/api/chat/conversations", { userId: otherId }, bearer(me.token));

const sendRest = (me, conversationId, text) =>
  api.post(`/api/chat/conversations/${conversationId}/messages`, { text }, bearer(me.token));

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = connectClient(socketUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
    openSockets.push(socket);
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });

const once = (socket, event) =>
  new Promise((resolve) => socket.once(event, resolve));

const emitSend = (socket, payload) =>
  new Promise((resolve) => socket.emit("message:send", payload, resolve));

// alice + bob: approved club mates. alice + dave: same adventure. carol: unrelated.
// erin: asked to join alice's club but is not approved yet.
let alice, bob, carol, dave, erin;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  api = await start();

  socketServer = http.createServer(app);
  attachSocket(socketServer);
  await new Promise((r) => socketServer.listen(0, r));
  socketUrl = `http://127.0.0.1:${socketServer.address().port}`;

  [alice, bob, carol, dave, erin] = await Promise.all(
    ["alice", "bob", "carol", "dave", "erin"].map((n) => registerUser(`${n}@example.com`))
  );

  await User.updateMany(
    { _id: mongoose.trusted({ $in: [alice.id, bob.id] }) },
    { clubCode: "CLUB01", clubApproved: true }
  );
  await User.updateOne({ _id: erin.id }, { clubCode: "CLUB01", clubApproved: false });

  await AdventureAccess.create({
    adventure: new mongoose.Types.ObjectId(),
    owner: alice.id,
    accessCode: "ADV001",
    players: [alice.id, dave.id],
  });
});

test.after(async () => {
  openSockets.forEach((s) => s.close());
  await new Promise((r) => socketServer.close(r));
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test("chat endpoints require a login", async () => {
  const res = await api.get("/api/chat/conversations");
  assert.equal(res.status, 401);
});

test("contacts are club mates and adventure co-players only", async () => {
  const res = await api.get("/api/chat/contacts", bearer(alice.token));
  assert.equal(res.status, 200);
  const ids = (await json(res)).map((c) => String(c.id)).sort();
  assert.deepEqual(ids, [String(bob.id), String(dave.id)].sort());

  const none = await json(await api.get("/api/chat/contacts", bearer(carol.token)));
  assert.deepEqual(none, []);
});

test("a conversation can be started with a club mate or co-player, once per pair", async () => {
  let res = await startChat(alice, bob.id);
  assert.equal(res.status, 200);
  const first = await json(res);
  assert.equal(String(first.other.id), String(bob.id));

  // Reopening from the other side returns the same conversation.
  res = await startChat(bob, alice.id);
  assert.equal(String((await json(res)).id), String(first.id));

  res = await startChat(alice, dave.id);
  assert.equal(res.status, 200);
});

test("strangers, pending club members, yourself and bad ids are refused", async () => {
  assert.equal((await startChat(alice, carol.id)).status, 403);
  assert.equal((await startChat(alice, erin.id)).status, 403, "pending member");
  assert.equal((await startChat(alice, alice.id)).status, 400);
  assert.equal((await startChat(alice, "not-an-id")).status, 400);
});

test("messages are stored, listed newest first, and paginated", async () => {
  const conv = await json(await startChat(alice, bob.id));

  for (const text of ["one", "two", "three"]) {
    const res = await sendRest(alice, conv.id, text);
    assert.equal(res.status, 201);
  }
  assert.equal((await sendRest(bob, conv.id, "  reply  ")).status, 201);

  let res = await api.get(`/api/chat/conversations/${conv.id}/messages`, bearer(bob.token));
  assert.equal(res.status, 200);
  const all = await json(res);
  assert.deepEqual(
    all.map((m) => m.text),
    ["reply", "three", "two", "one"]
  );

  res = await api.get(
    `/api/chat/conversations/${conv.id}/messages?limit=2`,
    bearer(alice.token)
  );
  const page1 = await json(res);
  assert.deepEqual(page1.map((m) => m.text), ["reply", "three"]);

  res = await api.get(
    `/api/chat/conversations/${conv.id}/messages?limit=2&before=${encodeURIComponent(
      page1[1].createdAt
    )}`,
    bearer(alice.token)
  );
  assert.deepEqual((await json(res)).map((m) => m.text), ["two", "one"]);

  // The inbox shows the conversation with its last message.
  const inbox = await json(await api.get("/api/chat/conversations", bearer(alice.token)));
  const entry = inbox.find((c) => String(c.id) === String(conv.id));
  assert.equal(entry.lastMessage.text, "reply");
});

test("only participants can read or write, and bad messages are rejected", async () => {
  const conv = await json(await startChat(alice, bob.id));

  let res = await api.get(`/api/chat/conversations/${conv.id}/messages`, bearer(carol.token));
  assert.equal(res.status, 404);

  res = await sendRest(carol, conv.id, "hi");
  assert.equal(res.status, 404);

  assert.equal((await sendRest(alice, conv.id, "   ")).status, 400);
  assert.equal((await sendRest(alice, conv.id, "x".repeat(1001))).status, 400);
  assert.equal(
    (await api.post(`/api/chat/conversations/${conv.id}/messages`, {}, bearer(alice.token))).status,
    400
  );
  assert.equal(
    (await api.get(`/api/chat/conversations/nope/messages`, bearer(alice.token))).status,
    400
  );
});

test("sockets reject a missing or invalid token", async () => {
  await assert.rejects(connect(undefined), /unauthorized/);
  await assert.rejects(connect("garbage"), /unauthorized/);
});

test("a message sent over a socket reaches the recipient live and is saved", async () => {
  const conv = await json(await startChat(alice, bob.id));
  const aliceSocket = await connect(alice.token);
  const bobSocket = await connect(bob.token);

  const incoming = once(bobSocket, "message:new");
  const updated = once(bobSocket, "conversation:updated");

  const ack = await emitSend(aliceSocket, { conversationId: conv.id, text: "hello bob" });
  assert.equal(ack.ok, true);

  const { message } = await incoming;
  assert.equal(message.text, "hello bob");
  assert.equal(String(message.sender), String(alice.id));

  const { conversation } = await updated;
  assert.equal(String(conversation.other.id), String(alice.id), "bob sees alice as the other side");

  const history = await json(
    await api.get(`/api/chat/conversations/${conv.id}/messages?limit=1`, bearer(bob.token))
  );
  assert.equal(history[0].text, "hello bob");
});

test("a REST send is also pushed to connected sockets", async () => {
  const conv = await json(await startChat(alice, bob.id));
  const bobSocket = await connect(bob.token);

  const incoming = once(bobSocket, "message:new");
  assert.equal((await sendRest(alice, conv.id, "via rest")).status, 201);
  assert.equal((await incoming).message.text, "via rest");
});

test("socket sends are validated and rate limited", async () => {
  const conv = await json(await startChat(alice, bob.id));
  const aliceSocket = await connect(alice.token);

  let ack = await emitSend(aliceSocket, { conversationId: conv.id, text: "" });
  assert.equal(ack.ok, false);

  ack = await emitSend(aliceSocket, null);
  assert.equal(ack.ok, false);

  let refused = null;
  for (let i = 0; i < 25 && !refused; i++) {
    const r = await emitSend(aliceSocket, { conversationId: conv.id, text: `spam ${i}` });
    if (!r.ok && /too fast/.test(r.message)) refused = r;
  }
  assert.ok(refused, "flooding should be refused");
});

test("leaving the club ends the chat for new messages, but history stays readable", async () => {
  const conv = await json(await startChat(alice, bob.id));
  assert.equal((await sendRest(alice, conv.id, "before kick")).status, 201);

  await User.updateOne({ _id: bob.id }, { clubCode: null, clubApproved: false });

  assert.equal((await sendRest(alice, conv.id, "after kick")).status, 403);
  assert.equal((await sendRest(bob, conv.id, "after kick")).status, 403);

  const res = await api.get(`/api/chat/conversations/${conv.id}/messages`, bearer(bob.token));
  assert.equal(res.status, 200);
});
