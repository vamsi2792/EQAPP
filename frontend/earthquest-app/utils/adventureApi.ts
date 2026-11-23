import { getToken } from "./authStorage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type CatalogueAdventure = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
  requiresGM: boolean;
};

export type MyAdventure = {
  id: string;
  adventure: { id: string; title: string; subtitle: string };
  role: "owner" | "player";
  playerCount: number;
  // Only the Game Mentor who bought the adventure receives these.
  memberCode?: string;
  gmCode?: string | null;
  isActive?: boolean;
};

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

export const enterCode = (code: string) =>
  request<{ message: string; group: MyAdventure }>("POST", "/enter-code", { code });

export const fetchMine = () => request<MyAdventure[]>("GET", "/mine");
export const newMemberCode = (id: string) => request<MyAdventure[]>("POST", `/mine/${id}/new-code`);
export const setAdventureActive = (id: string, isActive: boolean) =>
  request<MyAdventure[]>("POST", `/mine/${id}/active`, { isActive });
