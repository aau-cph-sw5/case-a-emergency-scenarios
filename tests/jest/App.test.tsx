import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import App from "../../mobile/App";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@react-native-community/netinfo", () =>
  require("@react-native-community/netinfo/jest/netinfo-mock.js"),
);
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-secure-store", () => {
  const items = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      items.delete(key);
    },
  };
});

const COPY_KEY = "metro-active-scenario-copy";

// A stored steward session whose token carries user id 7.
async function storeSession() {
  const payload = Buffer.from(JSON.stringify({ userId: 7 })).toString(
    "base64url",
  );
  await SecureStore.setItemAsync(
    "metro-scenario-session",
    JSON.stringify({
      token: `header.${payload}.signature`,
      role: "STEWARD",
      expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  );
}

async function storeCopy() {
  const snapshot = buildSnapshot(
    {
      active: true,
      state: activeState as ScenarioState,
      scenario: scenario as Scenario,
    },
    "7",
    new Date(),
  );
  await AsyncStorage.setItem(COPY_KEY, JSON.stringify(snapshot));
}

function response(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

afterEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync("metro-scenario-session");
});

describe("App", () => {
  it("opens on the saved copy when the session cannot be confirmed offline", async () => {
    await storeSession();
    await storeCopy();
    jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new TypeError("Network request failed"));

    render(<App />);

    expect(await screen.findByText(/gemt kopi/)).toBeTruthy();
    expect(screen.getByText(scenario.name)).toBeTruthy();
    expect(screen.queryByText("Rapportér position")).toBeNull();
  });

  it("removes the copy when the server no longer accepts the session", async () => {
    await storeSession();
    await storeCopy();
    jest.spyOn(global, "fetch").mockResolvedValue(response(401));

    render(<App />);

    expect(await screen.findByText("Log ind")).toBeTruthy();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(COPY_KEY)).toBeNull(),
    );
  });
});
