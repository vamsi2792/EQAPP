import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type ProfileFields = {
  age?: string;
  gender?: string;
  ethnicity?: string;
  language?: string;
  location?: string;
  discord?: string;
  aboutMe?: string;
};

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  email: string;
  profile?: ProfileFields;
  accountType: "viewer" | "registrant" | "member" | "gm";
  membershipActive: boolean;
  suScore?: { categoryScores?: Record<string, number> };
};

export type ProfileUpdate = {
  firstName?: string;
  lastName?: string;
  username?: string;
  profile?: ProfileFields;
};

export class ProfileApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new ProfileApiError(0, "App is not configured (missing API URL)");

  const token = await getToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}/api/profile${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ProfileApiError(0, "Cannot reach the server. Check your connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ProfileApiError(res.status, data?.message || "Something went wrong");
  }

  return data as T;
}

export const fetchProfile = async () => (await request<{ user: Profile }>("GET", "/full")).user;

export const updateProfile = async (changes: ProfileUpdate) =>
  (await request<{ user: Profile }>("PUT", "/update", changes)).user;

/** Plain-language account type for display. */
export const accountTypeLabel = (t: Profile["accountType"]) =>
  ({ viewer: "Viewer", registrant: "Registered", member: "Member", gm: "Game Master" })[t] ?? t;
