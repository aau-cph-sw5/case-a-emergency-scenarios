export interface ScenarioSummary {
  scenarioId: string;
  name: string;
  currentVersion: string;
}

export interface HealthStatus {
  ok: boolean;
}

export interface ApiClient {
  fetchHealth(): Promise<HealthStatus>;
  fetchScenarios(): Promise<ScenarioSummary[]>;
}

const REQUEST_TIMEOUT_MS = 10_000;

export function createApiClient(baseUrl: string): ApiClient {
  async function getJson<T>(path: string): Promise<T> {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`GET ${path} failed with ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          `No response from ${url} within ${REQUEST_TIMEOUT_MS / 1000}s`,
          { cause: error },
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    fetchHealth: () => getJson<HealthStatus>("/health"),
    fetchScenarios: () => getJson<ScenarioSummary[]>("/api/v1/scenarios"),
  };
}
