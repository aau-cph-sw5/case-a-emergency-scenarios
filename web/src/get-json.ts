const REQUEST_TIMEOUT_MS = 10_000;

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
    throw new Error(`GET ${path} failed with ${response.status}`);
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
    const message = (data as { error?: { message?: unknown } } | null)?.error
      ?.message;
    throw new Error(
      typeof message === "string"
        ? message
        : `POST ${path} failed with ${response.status}`,
    );
  }
  if (!isValid(data)) {
    throw new Error(`POST ${path} answered in an unexpected format`);
  }
  return data;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
