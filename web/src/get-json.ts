import { ERROR_CODES } from "../../shared/error-codes";
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

function buildHeaders(token: string, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (hasBody) headers["Content-Type"] = "application/json";
  return headers;
}

// The server's error body is { error: { code, message } }; both are optional.
function parseApiError(
  method: string,
  path: string,
  status: number,
  data: unknown,
): ApiError {
  const body = (
    data as { error?: { code?: unknown; message?: unknown } } | null
  )?.error;
  return new ApiError(
    typeof body?.message === "string"
      ? body.message
      : `${method} ${path} failed with ${status}`,
    status,
    typeof body?.code === "string" ? body.code : undefined,
  );
}

type RequestOptions = { body?: unknown; signals?: AbortSignal[] };

// vite.config forwards /api to the server. A failed request or an unreadable
// body is reported the same way for GET and POST.
async function requestJson<T>(
  method: "GET" | "POST",
  path: string,
  token: string,
  isValid: (data: unknown) => data is T,
  { body, signals = [] }: RequestOptions = {},
): Promise<T> {
  const response = await fetchWithTimeout(path, signals, {
    method,
    headers: buildHeaders(token, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw parseApiError(method, path, response.status, data);
  }
  if (!isValid(data)) {
    throw new Error(`${method} ${path} answered in an unexpected format`);
  }
  return data;
}

export function getJson<T>(
  path: string,
  token: string,
  isValid: (data: unknown) => data is T,
  ...signals: AbortSignal[]
): Promise<T> {
  return requestJson("GET", path, token, isValid, { signals });
}

// body is sent as JSON when given; without it the request has no body.
// signal aborts the request, e.g. when the component unmounts.
export function postJson<T>(
  path: string,
  token: string,
  isValid: (data: unknown) => data is T,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson("POST", path, token, isValid, {
    body,
    signals: signal ? [signal] : [],
  });
}

const SESSION_EXPIRED = "Din session er udløbet. Log ind igen.";
const NOT_PERMITTED = "Du har ikke adgang til denne handling.";
const NOT_FOUND = "Scenariet findes ikke længere.";
const ALREADY_ACTIVE = "Scenariet er allerede aktivt.";

const MESSAGE_BY_CODE: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: SESSION_EXPIRED,
  [ERROR_CODES.ROLE_NOT_PERMITTED]: NOT_PERMITTED,
  [ERROR_CODES.NOT_FOUND]: NOT_FOUND,
  [ERROR_CODES.CONFLICT]: ALREADY_ACTIVE,
  [ERROR_CODES.SCENARIO_STOOD_DOWN]: "Scenariet er allerede deaktiveret.",
};

const MESSAGE_BY_STATUS: Record<number, string> = {
  401: SESSION_EXPIRED,
  403: NOT_PERMITTED,
  404: NOT_FOUND,
  409: ALREADY_ACTIVE,
};

// The code decides the text; an unknown or missing code falls back on the
// status, so a new server code still gets a sensible text.
export function userMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Ingen forbindelse til serveren. Prøv igen.";
  }
  const known =
    (error.code === undefined ? undefined : MESSAGE_BY_CODE[error.code]) ??
    MESSAGE_BY_STATUS[error.status];
  if (known) return known;
  if (error.status >= 500) return "Serveren har et problem. Prøv igen om lidt.";
  return "Handlingen kunne ikke gennemføres.";
}
