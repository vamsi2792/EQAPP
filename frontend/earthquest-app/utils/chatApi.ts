import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type ChatUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
};

export type ChatMessage = {
  id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  other: ChatUser;
  lastMessage: { text: string; sender: string; at: string } | null;
  updatedAt: string;
};

export class ChatApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new ChatApiError(0, "App is not configured (missing API URL)");

  const token = await getToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}/api/chat${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ChatApiError(0, "Cannot reach the server. Check your connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ChatApiError(res.status, data?.message || "Something went wrong");
  }

  return data as T;
}

export const fetchContacts = () => request<ChatUser[]>("GET", "/contacts");

export const fetchConversations = () => request<ChatConversation[]>("GET", "/conversations");

export const openConversation = (userId: string) =>
  request<ChatConversation>("POST", "/conversations", { userId });

// Newest first; pass the oldest loaded message's createdAt as `before` to get the next page.
export const fetchMessages = (conversationId: string, before?: string) =>
  request<ChatMessage[]>(
    "GET",
    `/conversations/${conversationId}/messages?limit=30${
      before ? `&before=${encodeURIComponent(before)}` : ""
    }`
  );

// REST fallback used only when the live socket is not connected.
export const sendMessageRest = (conversationId: string, text: string) =>
  request<ChatMessage>("POST", `/conversations/${conversationId}/messages`, { text });

export const displayName = (u: ChatUser) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Player";
