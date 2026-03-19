const User = require("../models/User");

/**
 * 🔐 Permission-based middleware
 * Usage:
 *   permissionMiddleware("canCreateClub")
 *   permissionMiddleware("canModerateClub")
 */
const permissionMiddleware = (permission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user || !user.permissions[permission]) {
        return res.status(403).json({
          message: "Access denied: insufficient permissions",
        });
      }

      req.currentUser = user;

      next();
    } catch (err) {
      return res.status(500).json({
        message: "Permission check failed",
      });
    }
  };
};

module.exports = permissionMiddleware;