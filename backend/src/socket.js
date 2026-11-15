const { Server } = require("socket.io");

const verifyAuthToken = require("./utils/verifyAuthToken");
const { allowedOrigins } = require("./config/cors");
const chat = require("./services/chat.service");

// At most SEND_LIMIT messages per SEND_WINDOW_MS on one connection.
const SEND_LIMIT = 20;
const SEND_WINDOW_MS = 10 * 1000;

let io = null;

const room = (userId) => `user:${userId}`;

/**
 * Pushes a stored message to both participants' sockets. Never throws: the message is
 * already saved, so a failed push must not turn a successful send into an error.
 */
const announceMessage = async (senderId, { message, conversation }) => {
  if (!io) return;

  try {
    const usersById = await chat.loadUsersById([conversation]);

    for (const participant of conversation.participants) {
      const id = String(participant);
      io.to(room(id)).emit("message:new", { message });
      io.to(room(id)).emit("conversation:updated", {
        conversation: chat.serializeConversation(conversation, id, usersById),
      });
    }
  } catch (err) {
    console.error("Chat push failed:", err.message);
  }
};

const attachSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: allowedOrigins.length ? { origin: allowedOrigins } : { origin: true },
  });

  // Same checks as the REST auth middleware (signature, expiry, revoked tokenVersion).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const verified = await verifyAuthToken(token);

      if (!verified) return next(new Error("unauthorized"));

      socket.data.userId = verified.userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const token = socket.handshake.auth.token;
    let sentAt = [];

    socket.join(room(userId));

    socket.on("message:send", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};

      try {
        const now = Date.now();
        sentAt = sentAt.filter((t) => now - t < SEND_WINDOW_MS);
        if (sentAt.length >= SEND_LIMIT) {
          return reply({ ok: false, message: "You are sending messages too fast" });
        }
        sentAt.push(now);

        // Long-lived connections must stop working once the token expires or is revoked.
        if (!(await verifyAuthToken(token))) {
          reply({ ok: false, message: "Session expired, please log in again" });
          return socket.disconnect(true);
        }

        const { conversationId, text } = payload || {};
        const sent = await chat.sendMessage(userId, conversationId, text);

        reply({ ok: true, message: sent.message });
        await announceMessage(userId, sent);
      } catch (err) {
        if (!err.status) console.error("Socket send failed:", err.message);
        reply({ ok: false, message: err.status ? err.message : "Failed to send message" });
      }
    });
  });

  return io;
};

module.exports = { attachSocket, announceMessage };
