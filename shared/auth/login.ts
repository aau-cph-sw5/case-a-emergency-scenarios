// No react-native imports here, so the unit tests can import this file.
import { FormatError, HttpError } from "../api/http";
import { REQUEST_TIMEOUT_MS } from "../http";
import type { Client } from "./client-access";
import { isLineGroup, type LineGroup } from "./line-groups";
import { isSession, type Session } from "./session";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid username or password");
    this.name = "InvalidCredentialsError";
  }
}

export async function login(
  apiBaseUrl: string,
  username: string,
  password: string,
  client: Client,
  fetchImpl: typeof fetch = fetch,
): Promise<Session> {
  const response = await fetchImpl(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401) {
    throw new InvalidCredentialsError();
  }
  if (!response.ok) {
    throw new HttpError("POST /api/v1/auth/login", response.status);
  }
  const data: unknown = await response.json();
  if (!isSession(data)) {
    throw new FormatError("a login response");
  }
  return data;
}

// The claims the server put in the token ({ userId, role, lineGroup } in
// src/services/auth-service.ts), or null for a token it cannot read. The
// signature is not checked: the claims only decide what the client shows, the
// server still checks the token on every request.
function tokenClaims(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (payload === undefined) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data: unknown = JSON.parse(atob(base64));
    return typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// The user id from the token. Read without a request, so it is known even
// when the network drops right after login; it decides whose offline copy to
// show. Returns null for a token it cannot read.
export function userIdFromToken(token: string): string | null {
  const userId = tokenClaims(token)?.userId;
  // The server signs the database id (a number); older tokens and the stub
  // use a string. Both are returned as a string.
  if (typeof userId === "number" && Number.isFinite(userId)) {
    return String(userId);
  }
  return typeof userId === "string" && userId !== "" ? userId : null;
}

export function lineGroupFromToken(token: string): LineGroup | null {
  const lineGroup = tokenClaims(token)?.lineGroup;
  return isLineGroup(lineGroup) ? lineGroup : null;
}
