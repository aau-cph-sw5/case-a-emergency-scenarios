import Constants from "expo-constants";
import { createApiClient } from "@case-a/api-client";

export type { ScenarioSummary } from "@case-a/api-client";

const API_PORT = 4010;

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;

  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (devHost) return `http://${devHost}:${API_PORT}`;

  throw new Error(
    "No API address: set EXPO_PUBLIC_API_URL, e.g. http://192.168.1.20:4010",
  );
}

export const apiBaseUrl = resolveBaseUrl();
export const api = createApiClient(apiBaseUrl);
