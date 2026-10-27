import { describe, expect, it } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useActivatedScenario } from "../../shared/socket/useActivatedScenario";
import type { AppSocket } from "../../shared/socket/createSocket";
import type { ScenarioActivated } from "../../shared/socket/events";
import type { Scenario } from "../../shared/types/v1/scenario";

type Handler = (arg?: unknown) => void;

function fakeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    connected: true,
    on(event: string, handler: Handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: Handler) {
      handlers.get(event)?.delete(handler);
    },
    fire(event: string, arg?: unknown) {
      handlers.get(event)?.forEach((handler) => handler(arg));
    },
  };
}

function activation(scenarioId: string, sequence: number): ScenarioActivated {
  return { scenario: { scenarioId } as Scenario, sentAt: "", sequence };
}

function ActivationProbe({
  socket,
  fetchCurrent,
}: {
  socket: AppSocket;
  fetchCurrent: () => Promise<ScenarioActivated | null>;
}) {
  const activated = useActivatedScenario(socket, fetchCurrent);
  return <Text>{activated?.scenario.scenarioId ?? "none"}</Text>;
}

describe("useActivatedScenario", () => {
  it("keeps a live activation when a slower fetch returns an older one", async () => {
    const socket = fakeSocket();
    let answerFetch!: (event: ScenarioActivated) => void;
    const fetchCurrent = () =>
      new Promise<ScenarioActivated | null>((resolve) => {
        answerFetch = resolve;
      });

    render(
      <ActivationProbe
        socket={socket as unknown as AppSocket}
        fetchCurrent={fetchCurrent}
      />,
    );

    act(() => socket.fire("scenario-activated", activation("DEMO-002", 2)));
    await act(async () => answerFetch(activation("DEMO-001", 1)));

    expect(screen.getByText("DEMO-002")).toBeTruthy();
  });

  it("applies a fetched activation that is newer than the live one", async () => {
    const socket = fakeSocket();
    let answerFetch!: (event: ScenarioActivated) => void;
    const fetchCurrent = () =>
      new Promise<ScenarioActivated | null>((resolve) => {
        answerFetch = resolve;
      });

    render(
      <ActivationProbe
        socket={socket as unknown as AppSocket}
        fetchCurrent={fetchCurrent}
      />,
    );

    act(() => socket.fire("scenario-activated", activation("DEMO-001", 1)));
    await act(async () => answerFetch(activation("DEMO-002", 2)));

    expect(screen.getByText("DEMO-002")).toBeTruthy();
  });
});
