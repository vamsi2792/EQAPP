const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { listContacts } = require("../utils/chatAccess");
const adminUserMiddleware = require("../middleware/adminUser.middleware");
const chat = require("../services/chat.service");
const moderation = require("../services/moderation.service");
const { announceMessage } = require("../socket");

router.use(authMiddleware);

// Filing reports is cheap to abuse (it puts work in front of admins), so it is capped tightly.
const reportLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.REPORT_RATE_LIMIT_MAX) || 10,
  message: { message: "Too many reports, please try again later" },
});

// Service errors carry an HTTP status; anything else is an unexpected failure.
const fail = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(fallback, err.message);
  return res.status(500).json({ message: fallback });
};

/* ===================== CONTACTS (who I may start a chat with) ===================== */
router.get("/contacts", async (req, res) => {
  try {
    res.json(await listContacts(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load contacts");
  }
});

/* ===================== MY CONVERSATIONS ===================== */
router.get("/conversations", async (req, res) => {
  try {
    res.json(await chat.listConversations(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load conversations");
  }
});

/* ===================== START (OR REOPEN) A CONVERSATION ===================== */
router.post("/conversations", async (req, res) => {
  try {
    res.json(await chat.getOrCreateConversation(req.user.userId, req.body.userId));
  } catch (err) {
    fail(res, err, "Failed to start conversation");
  }
});

/* ===================== HISTORY (newest first, paginated) ===================== */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { before, limit } = req.query;
    res.json(
      await chat.getMessages(req.user.userId, req.params.id, {
        before: typeof before === "string" ? before : undefined,
        limit: typeof limit === "string" ? limit : undefined,
      })
    );
  } catch (err) {
    fail(res, err, "Failed to load messages");
  }
});

/* ===================== SEND (REST fallback; the app normally uses the socket) ===================== */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const sent = await chat.sendMessage(req.user.userId, req.params.id, req.body.text);
    announceMessage(req.user.userId, sent);
    res.status(201).json(sent.message);
  } catch (err) {
    fail(res, err, "Failed to send message");
  }
});

/* ===================== BLOCKS ===================== */
// Two-way silence is enforced in utils/chatAccess.canChat. Nothing here ever tells the
// blocked person they were blocked.
router.get("/blocks", async (req, res) => {
  try {
    res.json(await moderation.listBlockedIds(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load blocked players");
  }
});

router.post("/blocks", async (req, res) => {
  try {
    await moderation.blockUser(req.user.userId, req.body.userId);
    res.status(201).json({ message: "Player blocked" });
  } catch (err) {
    fail(res, err, "Failed to block player");
  }
});

router.delete("/blocks/:userId", async (req, res) => {
  try {
    await moderation.unblockUser(req.user.userId, req.params.userId);
    res.json({ message: "Player unblocked" });
  } catch (err) {
    fail(res, err, "Failed to unblock player");
  }
});

/* ===================== REPORTS ===================== */
router.post("/reports", reportLimiter, async (req, res) => {
  try {
    const { messageId, reason, note } = req.body;
    const { created } = await moderation.reportMessage(req.user.userId, {
      messageId,
      reason,
      note,
    });
    res.status(created ? 201 : 200).json({ message: "Report received" });
  } catch (err) {
    fail(res, err, "Failed to send report");
  }
});

/* ===================== ADMIN REVIEW (ADMIN_EMAILS only) ===================== */
router.get("/admin/reports", adminUserMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    res.json(await moderation.listReports(typeof status === "string" ? status : undefined));
  } catch (err) {
    fail(res, err, "Failed to load reports");
  }
});

router.patch("/admin/reports/:id", adminUserMiddleware, async (req, res) => {
  try {
    if (req.body.status !== "resolved") {
      return res.status(400).json({ message: "status must be 'resolved'" });
    }
    res.json(await moderation.resolveReport(req.currentUser._id, req.params.id));
  } catch (err) {
    fail(res, err, "Failed to update report");
  }
});

module.exports = router;
