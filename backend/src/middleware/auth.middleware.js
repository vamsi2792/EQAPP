const verifyAuthToken = require("../utils/verifyAuthToken");

const unauthorized = (res, message = "Invalid or expired token") =>
  res.status(401).json({ message });

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized(res, "Authorization token missing");
    }

    const verified = await verifyAuthToken(authHeader.split(" ")[1]);

    if (!verified) {
      return unauthorized(res);
    }

    // Attach user info to request
    req.user = {
      userId: verified.userId,
    };

    next();
  } catch (error) {
    return unauthorized(res);
  }
};

module.exports = authMiddleware;
