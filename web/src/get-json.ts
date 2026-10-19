import { REQUEST_TIMEOUT_MS } from "../../shared/http";

// A non-2xx answer. message is for developers (and the console); users get
// userMessage(). code is the E-code from the server's error body, if any.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithTimeout(
  path: string,
  signals: AbortSignal[],
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      signal: AbortSignal.any([
        ...signals,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        `no answer from the server within ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        { cause: error },
      );
    }
    throw error;
  }
}

// vite.config forwards /api to the server
export async function getJson<T>(
  path: string,
  isValid: (data: unknown) => data is T,
  ...signals: AbortSignal[]
): Promise<T> {
  const response = await fetchWithTimeout(path, signals);
  if (!response.ok) {
    throw new ApiError(
      `GET ${path} failed with ${response.status}`,
      response.status,
    );
  }
  const data: unknown = await response.json();
  if (!isValid(data)) {
    throw new Error(`GET ${path} answered in an unexpected format`);
  }
  return data;
}

export async function postJson<T>(
  path: string,
  token: string,
  isValid: (data: unknown) => data is T,
): Promise<T> {
  const response = await fetchWithTimeout(path, [], {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (
      data as { error?: { code?: unknown; message?: unknown } } | null
    )?.error;
    throw new ApiError(
      typeof body?.message === "string"
        ? body.message
        : `POST ${path} failed with ${response.status}`,
      response.status,
      typeof body?.code === "string" ? body.code : undefined,
    );
  }
  if (!isValid(data)) {
    throw new Error(`POST ${path} answered in an unexpected format`);
  }
  return data;
}

// E0001 is AUTH_TOKEN_INVALID (src/error-codes.ts). Unknown codes fall back
// on the status, so a new server code still gets a sensible text.
export function userMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Ingen forbindelse til serveren. Prøv igen.";
  }
  if (error.code === "E0001" || error.status === 401) {
    return "Din session er udløbet. Log ind igen.";
  }
  if (error.status === 403) return "Du har ikke adgang til denne handling.";
  if (error.status === 404) return "Scenariet findes ikke længere.";
  if (error.status === 409) return "Scenariet er allerede aktivt.";
  if (error.status >= 500) return "Serveren har et problem. Prøv igen om lidt.";
  return "Handlingen kunne ikke gennemføres.";
}
