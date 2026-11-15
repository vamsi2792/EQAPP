import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type CatalogueAdventure = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
};

export type GroupSummary = {
  id: string;
  adventure: { id: string; title: string; subtitle: string };
  role: "owner" | "player";
  playerCount: number;
  // Only the group's owner receives these.
  code?: string;
  isActive?: boolean;
};

export type GroupPerson = {
  id: string;
  name: string;
  username: string | null;
  role?: "owner" | "player";
};

export type GroupDetail = GroupSummary & { players: GroupPerson[] };

export class AdventureApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new AdventureApiError(0, "App is not configured (missing API URL)");

  const token = await getToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}/api/adventures${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AdventureApiError(0, "Cannot reach the server. Check your connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AdventureApiError(res.status, data?.message || "Something went wrong");
  }

  return data as T;
}

type Done = { message: string };

export const fetchAdventures = () => request<CatalogueAdventure[]>("GET", "");

/** Game Masters only. Returns the group (with its code) for that adventure. */
export const createCode = (adventureId: string) =>
  request<{ accessCode: string; group: GroupSummary }>("POST", "/codes", { adventureId });

export const enterCode = (code: string) =>
  request<{ message: string; group: GroupSummary }>("POST", "/enter-code", { code });

export const fetchGroups = () => request<GroupSummary[]>("GET", "/groups");
export const fetchGroup = (id: string) => request<GroupDetail>("GET", `/groups/${id}`);

export const leaveGroup = (id: string) => request<Done>("POST", `/groups/${id}/leave`);
export const deleteGroup = (id: string) => request<Done>("DELETE", `/groups/${id}`);
export const removePlayer = (id: string, userId: string) =>
  request<Done>("POST", `/groups/${id}/remove`, { userId });
export const newCode = (id: string) => request<GroupDetail>("POST", `/groups/${id}/new-code`);
export const setGroupActive = (id: string, isActive: boolean) =>
  request<GroupDetail>("POST", `/groups/${id}/active`, { isActive });
