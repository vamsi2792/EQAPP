const mongoose = require("mongoose");

const User = require("../models/User");
const Block = require("../models/Block");
const Message = require("../models/Message");
const Report = require("../models/Report");
const { isObjectId } = require("../utils/validate");

const BEFORE = 4; // messages shown before the reported one
const AFTER = 2; // ...and after it

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/* ===================== BLOCKS ===================== */

const blockUser = async (userId, targetId) => {
  if (!isObjectId(targetId)) throw httpError(400, "Valid userId is required");
  if (String(userId) === String(targetId)) throw httpError(400, "You cannot block yourself");
  if (!(await User.exists({ _id: targetId }))) throw httpError(404, "User not found");

  try {
    await Block.create({ blocker: userId, blocked: targetId });
  } catch (err) {
    if (err.code !== 11000) throw err; // already blocked: fine
  }
};

const unblockUser = async (userId, targetId) => {
  if (!isObjectId(targetId)) throw httpError(400, "Valid userId is required");
  await Block.deleteOne({ blocker: userId, blocked: targetId });
};

/** Ids of the people `userId` has blocked. */
const listBlockedIds = async (userId) => {
  const blocks = await Block.find({ blocker: userId }).select("blocked");
  return blocks.map((b) => String(b.blocked));
};

/* ===================== REPORTS ===================== */

const toContext = (m, reportedId) => ({
  sender: m.sender,
  text: m.text,
  createdAt: m.createdAt,
  reported: String(m._id) === String(reportedId),
});

/**
 * Files a report about someone else's message in a conversation the caller belongs to.
 * Returns { created }: a repeat report of the same message by the same person is accepted
 * silently (created: false) so the button can be tapped twice without errors.
 */
const reportMessage = async (reporterId, { messageId, reason, note }) => {
  if (!isObjectId(messageId)) throw httpError(400, "Valid messageId is required");
  if (!Report.REASONS.includes(reason)) {
    throw httpError(400, `reason must be one of: ${Report.REASONS.join(", ")}`);
  }
  if (note !== undefined && (typeof note !== "string" || note.length > Report.MAX_NOTE_LENGTH)) {
    throw httpError(400, `note must be text of at most ${Report.MAX_NOTE_LENGTH} characters`);
  }

  const message = await Message.findById(messageId).populate("conversation");
  const conv = message && message.conversation;

  // Same answer for "missing" and "not yours" so message ids cannot be probed.
  if (!conv || !conv.participants.some((p) => String(p) === String(reporterId))) {
    throw httpError(404, "Message not found");
  }
  if (String(message.sender) === String(reporterId)) {
    throw httpError(400, "You cannot report your own message");
  }

  const [before, after] = await Promise.all([
    Message.find({ conversation: conv._id, createdAt: mongoose.trusted({ $lt: message.createdAt }) })
      .sort({ createdAt: -1 })
      .limit(BEFORE),
    Message.find({ conversation: conv._id, createdAt: mongoose.trusted({ $gt: message.createdAt }) })
      .sort({ createdAt: 1 })
      .limit(AFTER),
  ]);

  const context = [...before.reverse(), message, ...after].map((m) => toContext(m, message._id));

  try {
    await Report.create({
      reporter: reporterId,
      reported: message.sender,
      message: message._id,
      conversation: conv._id,
      reason,
      note: typeof note === "string" ? note : "",
      context,
    });
    return { created: true, reportedId: String(message.sender) };
  } catch (err) {
    if (err.code === 11000) return { created: false, reportedId: String(message.sender) };
    throw err;
  }
};

/* ===================== ADMIN REVIEW ===================== */

const serializeReport = (r) => ({
  id: r._id,
  reason: r.reason,
  note: r.note,
  status: r.status,
  createdAt: r.createdAt,
  resolvedAt: r.resolvedAt,
  reporter: r.reporter && { id: r.reporter._id, name: displayName(r.reporter) },
  reported: r.reported && { id: r.reported._id, name: displayName(r.reported) },
  context: r.context.map((c) => ({
    sender: c.sender,
    text: c.text,
    createdAt: c.createdAt,
    reported: c.reported,
  })),
});

const displayName = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Player";

const listReports = async (status = "open") => {
  if (!["open", "resolved"].includes(status)) throw httpError(400, "status must be open or resolved");

  const reports = await Report.find({ status })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("reporter reported", "firstName lastName username");

  return reports.map(serializeReport);
};

const resolveReport = async (adminId, reportId) => {
  if (!isObjectId(reportId)) throw httpError(400, "Invalid report id");

  const report = await Report.findByIdAndUpdate(
    reportId,
    { status: "resolved", resolvedBy: adminId, resolvedAt: new Date() },
    { new: true }
  ).populate("reporter reported", "firstName lastName username");

  if (!report) throw httpError(404, "Report not found");

  return serializeReport(report);
};

module.exports = {
  blockUser,
  unblockUser,
  listBlockedIds,
  reportMessage,
  listReports,
  resolveReport,
};
