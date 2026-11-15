// CORS_ORIGINS="https://a.com,https://b.com" restricts browser origins.
// Unset = allow all (local dev). Native mobile requests send no Origin and are unaffected.
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = { allowedOrigins };
