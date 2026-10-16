const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { start } = require("./helpers");

let api;
test.before(async () => {
  api = await start();
});
test.after(async () => {
  await api.close();
});

test("GET / reports the API is running and sets security headers", async () => {
  const res = await api.get("/");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("protected routes reject missing or bad tokens", async () => {
  assert.equal((await api.get("/api/arcgis-token")).status, 401);
  assert.equal(
    (await api.get("/api/auth/me", { authorization: "Bearer nope" })).status,
    401
  );
  const wrongSecret = jwt.sign({ userId: "x" }, "other-secret");
  assert.equal(
    (await api.get("/api/auth/me", { authorization: `Bearer ${wrongSecret}` })).status,
    401
  );
});

test("upgrade endpoints cannot be used with a normal user token", async () => {
  const token = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
  for (const path of ["/api/auth/upgrade-member", "/api/auth/upgrade-gm"]) {
    const res = await api.post(path, {}, { authorization: `Bearer ${token}` });
    assert.equal(res.status, 403, path);
    const wrongKey = await api.post(path, {}, { "x-admin-key": "wrong" });
    assert.equal(wrongKey.status, 403, path);
  }
});

test("signup validates input before touching the database", async () => {
  const base = { firstName: "A", lastName: "B", email: "a@b.com" };
  assert.equal((await api.post("/api/auth/signup", base)).status, 400);
  assert.equal(
    (await api.post("/api/auth/signup", { ...base, password: "short" })).status,
    400
  );
  // Non-string values (e.g. NoSQL operator objects) are rejected too.
  assert.equal(
    (await api.post("/api/auth/signup", { ...base, email: { $ne: null }, password: "longenough" })).status,
    400
  );
});

test("login, verify-email and reset-password reject malformed bodies", async () => {
  assert.equal((await api.post("/api/auth/login", {})).status, 400);
  assert.equal(
    (await api.post("/api/auth/login", { email: { $ne: null }, password: "x" })).status,
    400
  );
  assert.equal((await api.post("/api/auth/verify-email", { email: "a@b.com" })).status, 400);
  assert.equal(
    (
      await api.post("/api/auth/reset-password", {
        email: "a@b.com",
        otp: "123456",
        newPassword: "short",
      })
    ).status,
    400
  );
});

test("auth endpoints are rate limited", async () => {
  let last;
  for (let i = 0; i < 30; i++) last = await api.post("/api/auth/login", {});
  assert.equal(last.status, 429);
});
