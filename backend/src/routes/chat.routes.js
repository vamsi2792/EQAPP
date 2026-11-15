const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { listContacts } = require("../utils/chatAccess");
const chat = require("../services/chat.service");
const { announceMessage } = require("../socket");

router.use(authMiddleware);

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

module.exports = router;
