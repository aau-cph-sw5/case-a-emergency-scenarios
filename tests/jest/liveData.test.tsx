import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import type { AppSocket } from "../../shared/socket/createSocket";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { fetchActiveActivations } from "../../web/src/activations";
import { LiveDataProvider, useLiveData } from "../../web/src/data/liveData";
import { useScenario } from "../../web/src/data/useScenario";
import { fetchScenario, fetchScenarios } from "../../web/src/scenarios";

jest.mock("../../web/src/activations", () => ({
  fetchActiveActivations: jest.fn(),
}));
jest.mock("../../web/src/scenarios", () => ({
  fetchScenario: jest.fn(),
  fetchScenarios: jest.fn(),
}));
const activationsMock = jest.mocked(fetchActiveActivations);
const scenariosMock = jest.mocked(fetchScenarios);
const scenarioMock = jest.mocked(fetchScenario);

function activation(activationId: string): ScenarioState {
  return {
    activationId,
    scenarioId: "DEMO-001",
    startedAt: "2026-10-27T12:00:00Z",
    status: "ACTIVE",
    actor: "operator-test",
    deployments: [],
  };
}

function scenario(scenarioId: string): Scenario {
  return {
    scenarioId,
    name: `Scenario ${scenarioId}`,
    currentVersion: "1",
    versions: [],
  } as unknown as Scenario;
}

// Enough of a socket to register handlers and fire events by hand.
function fakeSocket() {
  const handlers = new Map<string, Set<() => void>>();
  const socket = {
    connected: true,
    on(event: string, handler: () => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: () => void) {
      handlers.get(event)?.delete(handler);
    },
  };
  const fire = (event: string) =>
    act(() => handlers.get(event)?.forEach((handler) => handler()));
  return { socket: socket as unknown as AppSocket, fire };
}

function wrapperFor(socket: AppSocket) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LiveDataProvider socket={socket} token="token">
        {children}
      </LiveDataProvider>
    );
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  scenariosMock.mockResolvedValue([]);
});

describe("useLiveData", () => {
  it("loads on login, again on activations-changed and on reconnect", async () => {
    const first = [activation("ACT-1")];
    const second = [activation("ACT-2")];
    const third = [activation("ACT-1"), activation("ACT-2")];
    activationsMock
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
      .mockResolvedValueOnce(third);
    const { socket, fire } = fakeSocket();

    const { result } = renderHook(() => useLiveData(), {
      wrapper: wrapperFor(socket),
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.activations).toEqual(first));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastUpdatedAt).not.toBeNull();

    fire("activations-changed");
    await waitFor(() => expect(result.current.activations).toEqual(second));

    fire("connect");
    await waitFor(() => expect(result.current.activations).toEqual(third));
    expect(activationsMock).toHaveBeenCalledTimes(3);
  });

  it("ignores an older answer that arrives after a newer one", async () => {
    let answerOld: (value: ScenarioState[]) => void = () => {};
    const newer = [activation("ACT-NEW")];
    activationsMock
      .mockReturnValueOnce(
        new Promise<ScenarioState[]>((resolve) => {
          answerOld = resolve;
        }),
      )
      .mockResolvedValueOnce(newer);
    const { socket, fire } = fakeSocket();

    const { result } = renderHook(() => useLiveData(), {
      wrapper: wrapperFor(socket),
    });
    fire("activations-changed");
    await waitFor(() => expect(result.current.activations).toEqual(newer));

    await act(async () => answerOld([activation("ACT-OLD")]));
    expect(result.current.activations).toEqual(newer);
  });

  it("keeps the last activations and reports the error when a load fails", async () => {
    const first = [activation("ACT-1")];
    activationsMock
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error("offline"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { socket, fire } = fakeSocket();

    const { result } = renderHook(() => useLiveData(), {
      wrapper: wrapperFor(socket),
    });
    await waitFor(() => expect(result.current.activations).toEqual(first));

    fire("activations-changed");
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.activations).toEqual(first);
  });

  it("loads the scenario names once", async () => {
    activationsMock.mockResolvedValue([]);
    scenariosMock.mockResolvedValue([{ scenarioId: "DEMO-001", name: "Demo" }]);
    const { socket, fire } = fakeSocket();

    const { result } = renderHook(() => useLiveData(), {
      wrapper: wrapperFor(socket),
    });
    await waitFor(() =>
      expect(result.current.scenarios).toEqual([
        { scenarioId: "DEMO-001", name: "Demo" },
      ]),
    );

    fire("activations-changed");
    await waitFor(() => expect(activationsMock).toHaveBeenCalledTimes(2));
    expect(scenariosMock).toHaveBeenCalledTimes(1);
  });

  it("refuses to run outside LiveDataProvider", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useLiveData())).toThrow(
      "outside <LiveDataProvider>",
    );
  });
});

describe("useScenario", () => {
  beforeEach(() => activationsMock.mockResolvedValue([]));

  it("returns nothing and loads nothing for null", () => {
    const { socket } = fakeSocket();
    const { result } = renderHook(() => useScenario(null), {
      wrapper: wrapperFor(socket),
    });

    expect(result.current).toEqual({
      scenario: null,
      isLoading: false,
      error: null,
    });
    expect(scenarioMock).not.toHaveBeenCalled();
  });

  it("never shows the answer for a scenario that is no longer selected", async () => {
    let answerFirst: (value: Scenario) => void = () => {};
    scenarioMock
      .mockReturnValueOnce(
        new Promise<Scenario>((resolve) => {
          answerFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(scenario("DEMO-002"));
    const { socket } = fakeSocket();

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useScenario(id),
      { wrapper: wrapperFor(socket), initialProps: { id: "DEMO-001" } },
    );
    expect(result.current.isLoading).toBe(true);

    rerender({ id: "DEMO-002" });
    await waitFor(() =>
      expect(result.current.scenario?.scenarioId).toBe("DEMO-002"),
    );

    await act(async () => answerFirst(scenario("DEMO-001")));
    expect(result.current.scenario?.scenarioId).toBe("DEMO-002");
  });

  it("shares one request between components asking for the same scenario", async () => {
    scenarioMock.mockResolvedValue(scenario("DEMO-001"));
    const { socket } = fakeSocket();

    const { result } = renderHook(
      () => [useScenario("DEMO-001"), useScenario("DEMO-001")],
      { wrapper: wrapperFor(socket) },
    );
    await waitFor(() =>
      expect(result.current[1].scenario?.scenarioId).toBe("DEMO-001"),
    );
    expect(scenarioMock).toHaveBeenCalledTimes(1);
  });

  it("reports an error and tries again on the next ask", async () => {
    scenarioMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(scenario("DEMO-001"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { socket } = fakeSocket();

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useScenario(id),
      { wrapper: wrapperFor(socket), initialProps: { id: "DEMO-001" } },
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());

    rerender({ id: null });
    rerender({ id: "DEMO-001" });
    await waitFor(() =>
      expect(result.current.scenario?.scenarioId).toBe("DEMO-001"),
    );
    expect(scenarioMock).toHaveBeenCalledTimes(2);
  });
});
