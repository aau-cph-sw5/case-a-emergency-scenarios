import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import {
  buildSnapshot,
  createSnapshotStore,
} from "../../shared/offline/scenario-snapshot";
import { useActiveScenario } from "../../shared/offline/use-active-scenario";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import type { Scenario } from "../../shared/types/v1/scenario";

const API_URL = "http://localhost:4010";
const state = activeState as ScenarioState;
const definition = scenario as Scenario;

// A token whose payload carries the user id, as the server signs it.
function tokenFor(userId: number) {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `header.${payload}.signature`;
}

function response(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

function memoryStore() {
  const items = new Map<string, string>();
  return createSnapshotStore({
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  });
}

function serverAnswers(scenarioState: ScenarioState = state) {
  return jest.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/v1/scenario-state")) {
      return response(200, scenarioState);
    }
    if (url.endsWith(`/api/v1/scenarios/${definition.scenarioId}`)) {
      return response(200, definition);
    }
    return response(404);
  });
}

const savedEarlier = new Date("2026-10-27T08:00:00Z");

function render(
  options: { online: boolean; userId?: number } & Partial<
    Parameters<typeof useActiveScenario>[0]
  >,
) {
  const onUnauthorized = jest.fn();
  const store = options.store ?? memoryStore();
  const hook = renderHook(() =>
    useActiveScenario({
      apiBaseUrl: API_URL,
      token: tokenFor(options.userId ?? 7),
      store,
      onUnauthorized,
      ...options,
    }),
  );
  return { ...hook, store, onUnauthorized };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useActiveScenario", () => {
  it("shows the active scenario live and saves it as the steward's copy", async () => {
    serverAnswers();
    const { result, store } = render({ online: true });

    await waitFor(() => expect(result.current.view.status).toBe("live"));
    await waitFor(async () =>
      expect((await store.load("7"))?.scenario.scenarioId).toBe("DEMO-001"),
    );
  });

  it("removes the copy when no scenario is active", async () => {
    serverAnswers({ ...state, status: "CLOSED" });
    const store = memoryStore();
    await store.save(
      buildSnapshot(
        { active: true, state, scenario: definition },
        "7",
        savedEarlier,
      ),
    );
    const { result } = render({ online: true, store });

    await waitFor(() => expect(result.current.view.status).toBe("none"));
    await waitFor(async () => expect(await store.load("7")).toBeNull());
  });

  it("shows the saved copy offline without a request", async () => {
    const fetchMock = serverAnswers();
    const store = memoryStore();
    await store.save(
      buildSnapshot(
        { active: true, state, scenario: definition },
        "7",
        savedEarlier,
      ),
    );
    const { result } = render({ online: false, store });

    await waitFor(() =>
      expect(result.current.view).toMatchObject({
        status: "copy",
        reason: "offline",
        snapshot: { savedAt: savedEarlier.toISOString() },
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never shows another steward's copy", async () => {
    const store = memoryStore();
    await store.save(
      buildSnapshot(
        { active: true, state, scenario: definition },
        "8",
        savedEarlier,
      ),
    );
    const { result } = render({ online: false, store });

    await waitFor(() =>
      expect(result.current.view).toEqual({
        status: "no-copy",
        reason: "offline",
      }),
    );
  });

  it("falls back to the copy when the request gets no answer", async () => {
    jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new TypeError("Network request failed"));
    const store = memoryStore();
    await store.save(
      buildSnapshot(
        { active: true, state, scenario: definition },
        "7",
        savedEarlier,
      ),
    );
    const { result } = render({ online: true, store });

    await waitFor(() =>
      expect(result.current.view).toMatchObject({
        status: "copy",
        reason: "offline",
      }),
    );
  });

  it("reports a refused token and shows the copy meanwhile", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(response(401));
    const store = memoryStore();
    await store.save(
      buildSnapshot(
        { active: true, state, scenario: definition },
        "7",
        savedEarlier,
      ),
    );
    const { result, onUnauthorized } = render({ online: true, store });

    await waitFor(() =>
      expect(result.current.view).toMatchObject({
        status: "copy",
        reason: "server",
      }),
    );
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("switches to the copy when the connection drops", async () => {
    serverAnswers();
    const store = memoryStore();
    const { result, rerender } = renderHook(
      ({ online }: { online: boolean }) =>
        useActiveScenario({
          apiBaseUrl: API_URL,
          token: tokenFor(7),
          online,
          store,
          onUnauthorized: () => undefined,
        }),
      { initialProps: { online: true } },
    );
    await waitFor(() => expect(result.current.view.status).toBe("live"));
    await waitFor(async () => expect(await store.load("7")).not.toBeNull());

    rerender({ online: false });

    await waitFor(() =>
      expect(result.current.view).toMatchObject({
        status: "copy",
        reason: "offline",
      }),
    );
  });
});
