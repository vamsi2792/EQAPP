const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    // 🔍 DEBUG LOG 1
    console.log("TOKEN RECEIVED:", token);

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔍 DEBUG LOG 2
      console.log("DECODED TOKEN:", decoded);

    } catch (err) {
      // 🔍 DEBUG LOG 3
      console.log("VERIFY ERROR:", err.message);

      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    console.log("MIDDLEWARE ERROR:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;