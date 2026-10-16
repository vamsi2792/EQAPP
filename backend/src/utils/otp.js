const crypto = require("crypto");

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// 6-digit code from a CSPRNG (Math.random is predictable).
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// OTPs are stored as HMACs so a database leak does not expose live codes.
const hashOtp = (otp) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(String(otp))
    .digest("hex");

const otpMatches = (plain, storedHash) => {
  if (!storedHash || plain === undefined || plain === null) return false;
  const a = Buffer.from(hashOtp(plain));
  const b = Buffer.from(String(storedHash));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { OTP_TTL_MS, MAX_OTP_ATTEMPTS, generateOtp, hashOtp, otpMatches };
