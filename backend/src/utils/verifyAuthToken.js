const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verifies a JWT and that the account still exists and the token has not been revoked
 * (tokenVersion is bumped on password reset / logout-all). Tokens issued before
 * tokenVersion existed carry no `tv` and count as version 0.
 *
 * Returns { userId, tokenVersion } or null when the token is not acceptable.
 * Shared by the REST auth middleware and the chat socket handshake.
 */
const verifyAuthToken = async (token) => {
  if (typeof token !== "string" || !token) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  const user = await User.findById(decoded.userId).select("tokenVersion");
  const tokenVersion = user ? user.tokenVersion || 0 : null;

  if (!user || tokenVersion !== (decoded.tv || 0)) return null;

  return { userId: String(decoded.userId), tokenVersion };
};

module.exports = verifyAuthToken;
