const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  path: string,
  signals: AbortSignal[],
): Promise<Response> {
  try {
    return await fetch(path, {
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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
