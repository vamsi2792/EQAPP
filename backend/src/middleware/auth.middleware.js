const jwt = require("jsonwebtoken");
const User = require("../models/User");

const unauthorized = (res, message = "Invalid or expired token") =>
  res.status(401).json({ message });

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized(res, "Authorization token missing");
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return unauthorized(res);
    }

    // The signature is valid; also make sure the account still exists and the token
    // has not been revoked (tokenVersion is bumped on password reset / logout-all).
    // Tokens issued before tokenVersion existed carry no `tv` and count as version 0.
    const user = await User.findById(decoded.userId).select("tokenVersion");

    if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
      return unauthorized(res);
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    return unauthorized(res);
  }
};

module.exports = authMiddleware;
