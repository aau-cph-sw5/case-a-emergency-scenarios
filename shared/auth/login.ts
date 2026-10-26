// No react-native imports here, so the unit tests can import this file.
import { FormatError, HttpError } from "../api/http";
import { REQUEST_TIMEOUT_MS } from "../http";
import { isRole, type Role } from "./roles";
import type { Session } from "./session";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid username or password");
    this.name = "InvalidCredentialsError";
  }
}

function isLoginResponse(data: unknown): data is Session {
  if (typeof data !== "object" || data === null) return false;
  const { token, role } = data as Record<string, unknown>;
  return typeof token === "string" && token !== "" && isRole(role);
}

export async function login(
  apiBaseUrl: string,
  username: string,
  password: string,
  expectedRole: Role,
  fetchImpl: typeof fetch = fetch,
): Promise<Session> {
  const response = await fetchImpl(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, expectedRole }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401) {
    throw new InvalidCredentialsError();
  }
  if (!response.ok) {
    throw new HttpError("POST /api/v1/auth/login", response.status);
  }
  const data: unknown = await response.json();
  if (!isLoginResponse(data)) {
    throw new FormatError("a login response");
  }
  return { token: data.token, role: data.role };
}

// The user id the server put in the token ({ userId, role } in
// src/services/auth-service.ts). Read without a request, so it is known even
// when the network drops right after login. The signature is not checked:
// this only decides whose offline copy to show, the server still checks the
// token on every request. Returns null for a token it cannot read.
export function userIdFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (payload === undefined) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data: unknown = JSON.parse(atob(base64));
    if (typeof data !== "object" || data === null) return null;
    const { userId } = data as Record<string, unknown>;
    // The server signs the database id (a number); older tokens and the stub
    // use a string. Both are returned as a string.
    if (typeof userId === "number" && Number.isFinite(userId)) {
      return String(userId);
    }
    return typeof userId === "string" && userId !== "" ? userId : null;
  } catch {
    return null;
  }
}
