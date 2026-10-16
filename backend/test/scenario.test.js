// Admin image management for map scenarios, against an in-memory MongoDB.
const os = require("os");
const fs = require("fs");
const path = require("path");

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eq-uploads-"));
process.env.ADMIN_EMAILS = "Admin@Example.com, other-admin@example.com";
process.env.AUTH_RATE_LIMIT_MAX = "1000";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

require("./mockEmail");
const { start } = require("./helpers");
const User = require("../src/models/User");

// Smallest valid files for each accepted format.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x1a, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
  Buffer.alloc(20),
]);

let mongod;
let api;
let admin;
let player;

const bearer = (t) => ({ authorization: `Bearer ${t.token}` });
const makeUser = async (email, verified = true) => {
  const u = await User.create({
    firstName: "T",
    lastName: "U",
    email,
    password: "x",
    emailVerified: verified,
    accountType: "registrant",
  });
  return { id: String(u._id), token: jwt.sign({ userId: u._id, tv: 0 }, process.env.JWT_SECRET) };
};
const upload = (t, scenario, buf, name = "pic.png", type = "image/png", caption) => {
  const form = new FormData();
  form.append("image", new Blob([buf], { type }), name);
  if (caption !== undefined) form.append("caption", caption);
  return fetch(`${api.base}/api/scenarios/${scenario}/images`, {
    method: "POST",
    headers: bearer(t),
    body: form,
  });
};
const send = (method, t, url, body) =>
  fetch(api.base + url, {
    method,
    headers: { "content-type": "application/json", ...bearer(t) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  api = await start();
  admin = await makeUser("admin@example.com");
  player = await makeUser("player@example.com");
});

test.after(async () => {
  await api.close();
  await mongoose.disconnect();
  await mongod.stop();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

test("players read scenario content; anonymous users cannot", async () => {
  assert.equal((await api.get("/api/scenarios/EQ1-F-1")).status, 401);

  const res = await api.get("/api/scenarios/EQ1-F-1", bearer(player));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    scenarioId: "EQ1-F-1",
    exists: false,
    customized: false,
    description: "",
    images: [],
  });

  assert.equal((await api.get("/api/scenarios/bad%20id!", bearer(player))).status, 400);
});

test("only admins (verified, listed email) can modify content", async () => {
  const unverifiedAdmin = await makeUser("other-admin@example.com", false);

  for (const t of [player, unverifiedAdmin]) {
    assert.equal((await upload(t, "EQ1-F-1", PNG)).status, 403);
    assert.equal(
      (await send("PUT", t, "/api/scenarios/EQ1-F-1", { description: "hi" })).status,
      403
    );
    assert.equal(
      (await send("POST", t, "/api/scenarios/EQ1-F-1/seed", { urls: [] })).status,
      403
    );
    assert.equal(
      (await send("DELETE", t, "/api/scenarios/EQ1-F-1/images/507f1f77bcf86cd799439011")).status,
      403
    );
  }

  // /me and login tell the app who is an admin.
  const me = await (await api.get("/api/auth/me", bearer(admin))).json();
  assert.equal(me.isAdmin, true);
  assert.equal((await (await api.get("/api/auth/me", bearer(player))).json()).isAdmin, false);
});

test("admin can upload, caption, reorder and delete images; players see them", async () => {
  let res = await upload(admin, "EQ1-C5", PNG, "a.png", "image/png", "First");
  assert.equal(res.status, 201);
  let body = await res.json();
  assert.equal(body.images.length, 1);
  assert.equal(body.images[0].caption, "First");
  assert.match(body.images[0].url, /^\/uploads\/scenarios\/[a-f0-9]{32}\.png$/);

  // jpeg + webp accepted; the stored extension comes from the file's real content.
  res = await upload(admin, "EQ1-C5", JPEG, "b.png", "image/png");
  assert.equal(res.status, 201);
  res = await upload(admin, "EQ1-C5", WEBP, "c.jpg", "image/jpeg");
  assert.equal(res.status, 201);
  body = await res.json();
  assert.deepEqual(
    body.images.map((i) => i.url.split(".").pop()),
    ["png", "jpg", "webp"]
  );

  // The file is publicly viewable at its URL (so every player's app can load it).
  const img = await fetch(api.base + body.images[0].url);
  assert.equal(img.status, 200);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
  assert.equal(img.headers.get("x-content-type-options"), "nosniff");

  // Players now see the admin's images.
  const seen = await (await api.get("/api/scenarios/EQ1-C5", bearer(player))).json();
  assert.equal(seen.images.length, 3);

  // Caption + text edits.
  const [first, second, third] = body.images;
  res = await send("PATCH", admin, `/api/scenarios/EQ1-C5/images/${second.id}`, {
    caption: "Renamed",
  });
  assert.equal(res.status, 200);
  res = await send("PUT", admin, "/api/scenarios/EQ1-C5", { description: "  New briefing  " });
  assert.equal((await res.json()).description, "New briefing");

  // Reorder: reverse. Bad orders are rejected.
  res = await send("PUT", admin, "/api/scenarios/EQ1-C5/order", {
    order: [third.id, second.id, first.id],
  });
  assert.deepEqual((await res.json()).images.map((i) => i.id), [third.id, second.id, first.id]);
  for (const order of [[first.id], [first.id, first.id, second.id], "x", [first.id, second.id, "507f1f77bcf86cd799439011"]]) {
    assert.equal((await send("PUT", admin, "/api/scenarios/EQ1-C5/order", { order })).status, 400);
  }

  // Delete removes the record and the file from disk.
  const onDisk = path.join(process.env.UPLOAD_DIR, "scenarios", first.url.split("/").pop());
  assert.ok(fs.existsSync(onDisk));
  res = await send("DELETE", admin, `/api/scenarios/EQ1-C5/images/${first.id}`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).images.length, 2);
  assert.ok(!fs.existsSync(onDisk));
  assert.equal(
    (await send("DELETE", admin, `/api/scenarios/EQ1-C5/images/${first.id}`)).status,
    404
  );
  assert.equal((await fetch(api.base + first.url)).status, 404);
});

test("uploads reject non-images, spoofed types, oversize files and missing files", async () => {
  // HTML/SVG/script disguised as an image is refused regardless of name or mimetype.
  for (const [buf, name, type] of [
    [Buffer.from("<script>alert(1)</script>"), "x.png", "image/png"],
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), "x.svg", "image/svg+xml"],
    [Buffer.from("GIF89a....."), "x.gif", "image/gif"],
  ]) {
    assert.equal((await upload(admin, "EQ1-E1", buf, name, type)).status, 400, name);
  }

  const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]);
  assert.equal((await upload(admin, "EQ1-E1", big)).status, 413);

  const noFile = await fetch(`${api.base}/api/scenarios/EQ1-E1/images`, {
    method: "POST",
    headers: bearer(admin),
    body: new FormData(),
  });
  assert.equal(noFile.status, 400);

  // Nothing was written for the rejected uploads.
  const files = fs.existsSync(path.join(process.env.UPLOAD_DIR, "scenarios"))
    ? fs.readdirSync(path.join(process.env.UPLOAD_DIR, "scenarios"))
    : [];
  assert.ok(files.every((f) => /\.(png|jpg|webp)$/.test(f)));
  assert.equal((await (await api.get("/api/scenarios/EQ1-E1", bearer(player))).json()).images.length, 0);

  // Path-traversal style ids never reach the filesystem.
  assert.equal((await upload(admin, "..%2F..%2Fetc", PNG)).status, 400);
  assert.equal((await api.get("/uploads/../../package.json")).status, 404);
});

test("admin can import built-in images once, and only http(s) URLs", async () => {
  const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];

  for (const bad of [["javascript:alert(1)"], ["file:///etc/passwd"], "nope", [123]]) {
    assert.equal(
      (await send("POST", admin, "/api/scenarios/EQ1-F-2/seed", { urls: bad })).status,
      400
    );
  }

  let res = await send("POST", admin, "/api/scenarios/EQ1-F-2/seed", { urls });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).images.map((i) => i.url), urls);

  // Importing again does not duplicate.
  res = await send("POST", admin, "/api/scenarios/EQ1-F-2/seed", { urls });
  assert.equal((await res.json()).images.length, 2);

  // Imported (external) images can be deleted too, without touching the disk.
  const first = (await (await api.get("/api/scenarios/EQ1-F-2", bearer(player))).json()).images[0];
  res = await send("DELETE", admin, `/api/scenarios/EQ1-F-2/images/${first.id}`);
  assert.equal((await res.json()).images.length, 1);

  // Removing the last image really leaves none (no fallback to built-ins).
  const last = (await (await api.get("/api/scenarios/EQ1-F-2", bearer(player))).json()).images[0];
  res = await send("DELETE", admin, `/api/scenarios/EQ1-F-2/images/${last.id}`);
  const emptied = await res.json();
  assert.equal(emptied.images.length, 0);
  assert.equal(emptied.customized, true);
  res = await send("POST", admin, "/api/scenarios/EQ1-F-2/seed", { urls });
  assert.equal((await res.json()).images.length, 2); // an empty list can be re-imported
});

test("text validation", async () => {
  assert.equal((await send("PUT", admin, "/api/scenarios/EQ1-F-3", { description: 5 })).status, 400);
  assert.equal(
    (await send("PUT", admin, "/api/scenarios/EQ1-F-3", { description: "x".repeat(2001) })).status,
    400
  );
  assert.equal(
    (await send("PATCH", admin, "/api/scenarios/EQ1-F-3/images/not-an-id", { caption: "x" })).status,
    400
  );
});
