import { io, Socket } from "socket.io-client";
import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

let socket: Socket | null = null;

/** The live chat connection, or null when signed out. */
export const getChatSocket = () => socket;

/** Opens the connection once after login. Safe to call repeatedly. */
export function connectChatSocket(): Socket | null {
  if (socket || !API_URL) return socket;

  socket = io(API_URL, {
    // The token is read on every (re)connect, so a fresh login is picked up automatically.
    auth: (cb) => {
      getToken().then((token) => cb({ token }));
    },
    transports: ["websocket", "polling"],
    // Lets the polling fallback pass through the ngrok tunnel's browser warning page.
    extraHeaders: { "ngrok-skip-browser-warning": "true" },
  });

  return socket;
}

/** Closes the connection on logout. */
export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type SendAck =
  | { ok: true; message: import("./chatApi").ChatMessage }
  | { ok: false; message: string };

/** Sends over the socket and resolves with the server's acknowledgement. */
export function sendOverSocket(conversationId: string, text: string): Promise<SendAck> {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ ok: false, message: "Not connected" });
      return;
    }

    socket
      .timeout(10000)
      .emit("message:send", { conversationId, text }, (err: Error | null, ack: SendAck) => {
        if (err || !ack) resolve({ ok: false, message: "No response from server" });
        else resolve(ack);
      });
  });
}
