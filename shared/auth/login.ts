// No react-native imports here, so the unit tests can import this file.
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
    throw new Error(`POST /api/v1/auth/login failed with ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!isLoginResponse(data)) {
    throw new Error("the server sent a login response in an unexpected format");
  }
  return { token: data.token, role: data.role };
}
