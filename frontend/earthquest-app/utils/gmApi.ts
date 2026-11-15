import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type Conduct = { version: string; title: string; points: string[] };

export type MyApplication = {
  id: string;
  status: "pending" | "approved" | "declined";
  message: string;
  decisionNote: string;
  createdAt: string;
  reviewedAt: string | null;
};

export type GmStanding = {
  state: "gm" | "pending" | "can_apply" | "membership_required";
  application: MyApplication | null;
};

export type AdminApplication = {
  id: string;
  status: "pending" | "approved" | "declined";
  message: string;
  decisionNote: string;
  createdAt: string;
  reviewedAt: string | null;
  applicant: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    accountType: string;
  } | null;
};

export type GmImpact = {
  club: { name: string; members: number } | null;
  groups: number;
  groupPlayers: number;
};

export type GameMentor = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  impact: GmImpact;
};

export class GmApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new GmApiError(0, "App is not configured (missing API URL)");

  const token = await getToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}/api/gm${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new GmApiError(0, "Cannot reach the server. Check your connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new GmApiError(res.status, data?.message || "Something went wrong");
  }

  return data as T;
}

/* ===================== PLAYERS ===================== */

export const fetchConduct = () => request<Conduct>("GET", "/conduct");
export const fetchStanding = () => request<GmStanding>("GET", "/applications/me");

export const submitApplication = (message: string, conductVersion: string) =>
  request<{ message: string; application: MyApplication }>("POST", "/applications", {
    message,
    conductVersion,
  });

/* ===================== ADMINS ===================== */

export const fetchApplications = (status: "pending" | "approved" | "declined" = "pending") =>
  request<AdminApplication[]>("GET", `/admin/applications?status=${status}`);

export const approveApplication = (id: string, note?: string) =>
  request<AdminApplication>("POST", `/admin/applications/${id}/approve`, {
    note: note?.trim() || undefined,
  });

export const declineApplication = (id: string, note?: string) =>
  request<AdminApplication>("POST", `/admin/applications/${id}/decline`, {
    note: note?.trim() || undefined,
  });

export const fetchGameMentors = () => request<GameMentor[]>("GET", "/admin/gms");

export const revokeGameMentor = (userId: string) =>
  request<{ message: string }>("POST", `/admin/gms/${userId}/revoke`);
