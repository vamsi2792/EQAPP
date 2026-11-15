const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { canChat, publicUser } = require("../utils/chatAccess");
const { isObjectId } = require("../utils/validate");

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const serializeMessage = (m) => ({
  id: m._id,
  conversation: m.conversation,
  sender: m.sender,
  text: m.text,
  createdAt: m.createdAt,
});

/** The conversation as one participant sees it (the other person + last message). */
const serializeConversation = (conv, viewerId, usersById) => {
  const otherId = conv.participants.map(String).find((id) => id !== String(viewerId));
  const other = usersById.get(otherId);

  return {
    id: conv._id,
    other: other ? publicUser(other) : { id: otherId, firstName: "Deleted", lastName: "user" },
    lastMessage: conv.lastMessage?.at
      ? {
          text: conv.lastMessage.text,
          sender: conv.lastMessage.sender,
          at: conv.lastMessage.at,
        }
      : null,
    updatedAt: conv.updatedAt,
  };
};

const loadUsersById = async (conversations) => {
  const ids = new Set(conversations.flatMap((c) => c.participants.map(String)));
  const users = await User.find({ _id: mongoose.trusted({ $in: [...ids] }) }).select(
    "firstName lastName username"
  );
  return new Map(users.map((u) => [String(u._id), u]));
};

/** Finds the participant's conversation or throws 404 (also for non-participants). */
const loadParticipantConversation = async (userId, conversationId) => {
  if (!isObjectId(conversationId)) throw httpError(400, "Invalid conversation id");

  const conv = await Conversation.findById(conversationId);
  if (!conv || !conv.participants.some((p) => String(p) === String(userId))) {
    throw httpError(404, "Conversation not found");
  }
  return conv;
};

const getOrCreateConversation = async (userId, otherId) => {
  if (!isObjectId(otherId)) throw httpError(400, "Valid userId is required");
  if (String(userId) === String(otherId)) throw httpError(400, "You cannot chat with yourself");

  const [me, other] = await Promise.all([User.findById(userId), User.findById(otherId)]);

  if (!other || !(await canChat(me, other))) {
    throw httpError(403, "You can only chat with players from your club or adventures");
  }

  const pairKey = Conversation.makePairKey(me._id, other._id);
  const find = () => Conversation.findOne({ pairKey });

  let conv = await find();

  if (!conv) {
    try {
      conv = await Conversation.create({ participants: [me._id, other._id], pairKey });
    } catch (err) {
      if (err.code !== 11000) throw err;
      conv = await find(); // another request created it first
    }
  }

  const usersById = await loadUsersById([conv]);
  return serializeConversation(conv, userId, usersById);
};

const listConversations = async (userId) => {
  const convs = await Conversation.find({
    participants: userId,
    "lastMessage.at": mongoose.trusted({ $ne: null }),
  })
    .sort({ updatedAt: -1 })
    .limit(100);

  const usersById = await loadUsersById(convs);
  return convs.map((c) => serializeConversation(c, userId, usersById));
};

const MAX_PAGE = 50;

const getMessages = async (userId, conversationId, { before, limit } = {}) => {
  const conv = await loadParticipantConversation(userId, conversationId);

  const filter = { conversation: conv._id };
  if (before !== undefined) {
    const date = new Date(before);
    if (Number.isNaN(date.getTime())) throw httpError(400, "before must be an ISO date");
    filter.createdAt = mongoose.trusted({ $lt: date });
  }

  const size = Math.min(Math.max(parseInt(limit, 10) || 30, 1), MAX_PAGE);
  const rows = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(size);

  // Newest first, so the client can append older pages.
  return rows.map(serializeMessage);
};

/**
 * Stores a message and returns { message, conversation, recipientId }.
 * Eligibility is re-checked on every send, so leaving a club or being kicked ends the chat.
 */
const sendMessage = async (userId, conversationId, text) => {
  if (typeof text !== "string" || !text.trim()) throw httpError(400, "Message text is required");
  if (text.trim().length > Message.MAX_MESSAGE_LENGTH) {
    throw httpError(400, `Message is too long (max ${Message.MAX_MESSAGE_LENGTH} characters)`);
  }

  const conv = await loadParticipantConversation(userId, conversationId);
  const recipientId = conv.participants.map(String).find((id) => id !== String(userId));

  const [me, other] = await Promise.all([User.findById(userId), User.findById(recipientId)]);

  if (!(await canChat(me, other))) {
    throw httpError(403, "You can no longer chat with this player");
  }

  const message = await Message.create({
    conversation: conv._id,
    sender: userId,
    text: text.trim(),
  });

  conv.lastMessage = { text: message.text.slice(0, 200), sender: userId, at: message.createdAt };
  await conv.save();

  return { message: serializeMessage(message), conversation: conv, recipientId };
};

module.exports = {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  serializeConversation,
  loadUsersById,
};
