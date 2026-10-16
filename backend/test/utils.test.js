const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret";
const generateCode = require("../src/utils/generateCode");
const { generateOtp, hashOtp, otpMatches } = require("../src/utils/otp");

test("generateCode returns a 6-char uppercase code without look-alike characters", () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generateCode(), /^[A-HJKMNP-Z2-9]{6}$/);
  }
  assert.equal(generateCode(10).length, 10);
});

test("generateCode is not constant", () => {
  const codes = new Set(Array.from({ length: 50 }, () => generateCode()));
  assert.ok(codes.size > 40);
});

test("generateOtp returns 6 digits", () => {
  for (let i = 0; i < 200; i++) assert.match(generateOtp(), /^\d{6}$/);
});

test("otpMatches accepts the right code (string or number) and rejects others", () => {
  const stored = hashOtp("123456");
  assert.notEqual(stored, "123456");
  assert.equal(otpMatches("123456", stored), true);
  assert.equal(otpMatches(123456, stored), true);
  assert.equal(otpMatches("654321", stored), false);
  assert.equal(otpMatches("123456", null), false);
  assert.equal(otpMatches(undefined, stored), false);
});
