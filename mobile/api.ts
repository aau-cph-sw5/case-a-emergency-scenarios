import Constants from "expo-constants";
import { createApiClient } from "@case-a/api-client";

export type { ScenarioSummary } from "@case-a/api-client";

function resolveBaseUrl(): string {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (!apiUrl) {
    throw new Error("No API address: set API_URL in the repo-root .env");
  }
  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (!devHost) return apiUrl;

  return apiUrl.replace(
    /\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/,
    `//${devHost}`,
  );
}

export const apiBaseUrl = resolveBaseUrl();
export const api = createApiClient(apiBaseUrl);
