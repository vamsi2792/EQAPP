const User = require("../models/User");
const { isAdminUser } = require("../utils/admin");

/**
 * Must run after authMiddleware. Allows only content admins (see utils/admin.js).
 */
const adminUserMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!isAdminUser(user)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Admin check failed" });
  }
};

module.exports = adminUserMiddleware;
