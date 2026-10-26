import { REQUEST_TIMEOUT_MS } from "../http";
import { isRole, type Role } from "./roles";
import { RENEWAL_WINDOW_MS } from "./renewal";

export type Session = {
  token: string;
  role: Role;
  expiresAt: string;
};

export type CurrentUser = {
  userId: number;
  role: Role;
};

export type RenewalResult =
  | { kind: "renewed"; session: Session }
  | { kind: "not-due" }
  | { kind: "invalid" };

export function isSession(data: unknown): data is Session {
  if (typeof data !== "object" || data === null) return false;

  const { token, role, expiresAt } = data as Record<string, unknown>;

  return (
    typeof token === "string" &&
    token !== "" &&
    isRole(role) &&
    typeof expiresAt === "string" &&
    Number.isFinite(Date.parse(expiresAt))
  );
}

export function isRenewalDue(session: Session, now = Date.now()): boolean {
  const expiresAt = Date.parse(session.expiresAt);

  return expiresAt > now && expiresAt - now <= RENEWAL_WINDOW_MS;
}

function isCurrentUser(data: unknown): data is CurrentUser {
  if (typeof data !== "object" || data === null) return false;

  const { userId, role } = data as Record<string, unknown>;

  return typeof userId === "number" && isRole(role);
}

export async function getCurrentUser(
  apiBaseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CurrentUser | null> {
  const response = await fetchImpl(`${apiBaseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401) return null;

  if (!response.ok) {
    throw new Error(`GET /api/v1/me failed with ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!isCurrentUser(data)) {
    throw new Error("the server sent an unexpected current-user response");
  }

  return data;
}

export async function renewSession(
  apiBaseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RenewalResult> {
  const response = await fetchImpl(`${apiBaseUrl}/api/v1/auth/renew`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401) return { kind: "invalid" };

  if (response.status === 204) return { kind: "not-due" };

  if (!response.ok) {
    throw new Error(`POST /api/v1/auth/renew failed with ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!isSession(data)) {
    throw new Error("the server sent an unexpected renewal response");
  }

  return { kind: "renewed", session: data };
}

export async function logout(
  apiBaseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(`${apiBaseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 204 || response.status === 401) return;

  throw new Error(`POST /api/v1/auth/logout failed with ${response.status}`);
}
