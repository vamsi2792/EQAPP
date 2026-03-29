const User = require("../models/User");

/**
 * 🔐 Role-based middleware
 * Usage:
 *   roleMiddleware("gm")
 *   roleMiddleware("member", "gm")
 */
const roleMiddleware = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!allowedRoles.includes(user.accountType)) {
        return res.status(403).json({
          message: "Access denied: insufficient role",
        });
      }

      // attach full user for later use
      req.currentUser = user;

      next();
    } catch (err) {
      return res.status(500).json({
        message: "Role check failed",
      });
    }
  };
};

module.exports = roleMiddleware;