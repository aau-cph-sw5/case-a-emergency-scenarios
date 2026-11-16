// No react-native imports here, so the unit tests can import this file.
// How the clients talk to the API: one timeout and one set of error types,
// so callers can tell "no answer" from "the server answered with an error".
import { REQUEST_TIMEOUT_MS } from "../http";

// The server answered with an error status, e.g. 401 for an expired token.
export class HttpError extends Error {
  readonly status: number;

  constructor(request: string, status: number) {
    super(`${request} failed with ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

// The server answered, but not in the shape the contract describes.
export class FormatError extends Error {
  constructor(what: string) {
    super(`the server sent ${what} in an unexpected format`);
    this.name = "FormatError";
  }
}

export function encodeApiPathSegment(value: string): string {
  if (
    value.length === 0 ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new FormatError("a path segment that cannot be used in a URL");
  }
  return encodeURIComponent(value);
}

function sanitizeApiPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];
  for (const segment of pathname.split("/")) {
    const decoded = decodeURIComponent(segment);
    if (
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\")
    ) {
      throw new TypeError("API paths must not contain traversal segments");
    }
  }
  return path;
}

// GET an endpoint with the bearer token and check the answer against the
// contract. A failed or timed-out request rejects with fetch's own error.
export async function getJson<T>(
  apiBaseUrl: string,
  path: string,
  token: string,
  isValid: (data: unknown) => data is T,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(`${apiBaseUrl}${sanitizeApiPath(path)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new HttpError(`GET ${path}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isValid(data)) {
    throw new FormatError(path);
  }
  return data;
}
