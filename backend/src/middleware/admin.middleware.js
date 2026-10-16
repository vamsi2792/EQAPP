const crypto = require("crypto");

/**
 * Operator-only guard. Requires the `x-admin-key` header to match ADMIN_API_KEY.
 * Fails closed: if ADMIN_API_KEY is not configured, every request is rejected.
 * Intended for privileged actions (membership/GM promotion) until a payment
 * webhook or real admin role exists.
 */
const adminMiddleware = (req, res, next) => {
  const expected = process.env.ADMIN_API_KEY;
  const provided = req.headers["x-admin-key"];

  if (!expected || typeof provided !== "string") {
    return res.status(403).json({ message: "Admin access required" });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

module.exports = adminMiddleware;
