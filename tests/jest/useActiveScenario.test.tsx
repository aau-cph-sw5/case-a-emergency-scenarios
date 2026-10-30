import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
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

  it("keeps the copy when the scenario lacks its current version", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) =>
        String(input).endsWith("/api/v1/scenario-state")
          ? response(200, state)
          : response(200, { ...definition, currentVersion: "99" }),
      );
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
        reason: "server",
        snapshot: { savedAt: savedEarlier.toISOString() },
      }),
    );
    expect((await store.load("7"))?.savedAt).toBe(savedEarlier.toISOString());
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

  it("a save from an older refresh cannot land after a newer clear", async () => {
    let scenarioState = state;
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/v1/scenario-state")) {
        return response(200, scenarioState);
      }
      if (url.endsWith(`/api/v1/scenarios/${definition.scenarioId}`)) {
        return response(200, definition);
      }
      return response(404);
    });
    // The first write is slow, as a busy disk can be; later ones are fast.
    const items = new Map<string, string>();
    let releaseFirstSave = () => {};
    let firstSave = true;
    const store = createSnapshotStore({
      getItem: async (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        if (!firstSave) {
          items.set(key, value);
          return Promise.resolve();
        }
        firstSave = false;
        return new Promise<void>((resolve) => {
          releaseFirstSave = () => {
            items.set(key, value);
            resolve();
          };
        });
      },
      removeItem: async (key) => void items.delete(key),
    });
    const { result } = render({ online: true, store });
    await waitFor(() => expect(result.current.view.status).toBe("live"));

    // The scenario closes, and the next refresh removes the copy while the
    // first save is still writing.
    scenarioState = { ...state, status: "CLOSED" };
    act(() => {
      void result.current.refresh();
    });
    await waitFor(() => expect(result.current.view.status).toBe("none"));
    releaseFirstSave();

    await waitFor(async () => expect(await store.load("7")).toBeNull());
  });

  it("applies activations in the order they were generated, even when delivered out of order", async () => {
    let sequence = 2;
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/v1/scenario-state")) {
        return response(200, { ...state, sequence });
      }
      if (url.endsWith(`/api/v1/scenarios/${definition.scenarioId}`)) {
        return response(200, definition);
      }
      return response(404);
    });
    const { result, store } = render({ online: true });
    const shown = () =>
      result.current.view.status === "live"
        ? result.current.view.snapshot.state.sequence
        : undefined;
    await waitFor(() => expect(shown()).toBe(2));

    // Activation 1 arrives after 2: it is older, so 2 stays shown and saved.
    sequence = 1;
    await act(() => result.current.refresh());
    expect(shown()).toBe(2);
    expect((await store.load("7"))?.state.sequence).toBe(2);

    sequence = 3;
    await act(() => result.current.refresh());
    expect(shown()).toBe(3);
  });

  it("a slow answer to an older refresh cannot replace a newer one", async () => {
    let releaseFirst = () => {};
    let calls = 0;
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/v1/scenario-state")) {
        calls += 1;
        if (calls === 1) {
          return new Promise<Response>((resolve) => {
            releaseFirst = () =>
              resolve(response(200, { ...state, sequence: 1 }));
          });
        }
        return Promise.resolve(response(200, { ...state, sequence: 2 }));
      }
      if (url.endsWith(`/api/v1/scenarios/${definition.scenarioId}`)) {
        return Promise.resolve(response(200, definition));
      }
      return Promise.resolve(response(404));
    });
    const { result } = render({ online: true });
    await waitFor(() => expect(calls).toBe(1));

    await act(() => result.current.refresh());
    await act(async () => releaseFirst());

    expect(result.current.view).toMatchObject({
      status: "live",
      snapshot: { state: { sequence: 2 } },
    });
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
