import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type ClubRole = "gm" | "moderator" | "member" | "pending";

export type ClubPerson = {
  id: string;
  name: string;
  username: string | null;
  role?: "gm" | "moderator" | "member";
};

export type MyClub = {
  club: {
    id?: string;
    name: string;
    code: string;
    bio?: string;
    discord?: string;
    totalMembers?: number;
  } | null;
  myRole: ClubRole | null;
  // Present for approved players. Only GM/moderators also get `pending` and `banned`.
  members?: ClubPerson[];
  pending?: ClubPerson[];
  banned?: ClubPerson[];
};

export type ClubFields = { clubName?: string; bio?: string; discord?: string };

export class ClubApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new ClubApiError(0, "App is not configured (missing API URL)");

  const token = await getToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}/api/club${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ClubApiError(0, "Cannot reach the server. Check your connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ClubApiError(res.status, data?.message || "Something went wrong");
  }

  return data as T;
}

type Done = { message: string };

export const getMyClub = () => request<MyClub>("GET", "/me");

export const createClub = (fields: ClubFields) => request<unknown>("POST", "/create", fields);
export const updateClub = (fields: ClubFields) => request<MyClub>("PATCH", "/me", fields);
export const deleteClub = () => request<Done>("DELETE", "/me");

export type ClubSearchResult = { id: string; clubName: string; bio: string; memberCount: number };

export const searchClubs = (q: string) =>
  request<ClubSearchResult[]>("GET", `/search?q=${encodeURIComponent(q)}`);

export const joinClub = (clubCode: string) =>
  request<Done & { clubName: string }>("POST", "/join", { clubCode });
export const requestToJoin = (clubId: string) =>
  request<Done & { clubName: string }>("POST", "/join", { clubId });
export const leaveClub = () => request<Done>("POST", "/leave");

const member = (path: string) => (memberId: string) => request<Done>("POST", path, { memberId });

export const approveMember = member("/approve");
export const declineMember = member("/decline");
export const kickMember = member("/kick");
export const banMember = member("/ban");
export const unbanMember = member("/unban");
export const assignModerator = member("/assign-moderator");
export const removeModerator = member("/remove-moderator");
