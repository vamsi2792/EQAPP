const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const adminUserMiddleware = require("../middleware/adminUser.middleware");
const gm = require("../services/gm.service");

router.use(authMiddleware);

// Applying puts work in front of admins, so it is capped tightly.
const applyLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.GM_APPLY_RATE_LIMIT_MAX) || 5,
  message: { message: "Too many applications, please try again later" },
});

// Service errors carry an HTTP status; anything else is an unexpected failure.
const fail = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(fallback, err.message);
  return res.status(500).json({ message: fallback });
};

/* ===================== FOR PLAYERS ===================== */
router.get("/conduct", (req, res) => {
  res.json(gm.conduct);
});

router.get("/applications/me", async (req, res) => {
  try {
    res.json(await gm.myStatus(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load your application");
  }
});

router.post("/applications", applyLimiter, async (req, res) => {
  try {
    const { message, conductVersion } = req.body;
    const application = await gm.apply(req.user.userId, { message, conductVersion });
    res.status(201).json({ message: "Application sent", application });
  } catch (err) {
    fail(res, err, "Failed to send your application");
  }
});

/* ===================== FOR ADMINS (ADMIN_EMAILS) ===================== */
router.get("/admin/applications", adminUserMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    res.json(await gm.listApplications(typeof status === "string" ? status : undefined));
  } catch (err) {
    fail(res, err, "Failed to load applications");
  }
});

router.post("/admin/applications/:id/approve", adminUserMiddleware, async (req, res) => {
  try {
    res.json(await gm.approve(req.currentUser._id, req.params.id, req.body.note));
  } catch (err) {
    fail(res, err, "Failed to approve the application");
  }
});

router.post("/admin/applications/:id/decline", adminUserMiddleware, async (req, res) => {
  try {
    res.json(await gm.decline(req.currentUser._id, req.params.id, req.body.note));
  } catch (err) {
    fail(res, err, "Failed to decline the application");
  }
});

router.get("/admin/gms", adminUserMiddleware, async (req, res) => {
  try {
    res.json(await gm.listGms());
  } catch (err) {
    fail(res, err, "Failed to load Game Mentors");
  }
});

router.post("/admin/gms/:userId/revoke", adminUserMiddleware, async (req, res) => {
  try {
    const result = await gm.revokeGm(req.params.userId);
    res.json({ message: "Game Mentor status revoked", ...result });
  } catch (err) {
    fail(res, err, "Failed to revoke Game Mentor status");
  }
});

module.exports = router;
