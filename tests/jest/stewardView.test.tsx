import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { StewardView } from "../../mobile/src/screens/StewardView";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// A socket that only records listeners, so the test can announce events.
jest.mock("../../mobile/src/socket", () => {
  const listeners = new Map<string, Set<() => void>>();
  return {
    socket: {
      connected: false,
      on: (event: string, listener: () => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)?.add(listener);
      },
      off: (event: string, listener: () => void) => {
        listeners.get(event)?.delete(listener);
      },
      emit: (event: string) => {
        listeners.get(event)?.forEach((listener) => listener());
      },
    },
  };
});

const { socket } = jest.requireMock("../../mobile/src/socket") as {
  socket: { emit: (event: string) => void };
};

function response(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

const payload = Buffer.from(JSON.stringify({ userId: 7 })).toString(
  "base64url",
);
const token = `header.${payload}.signature`;

afterEach(() => {
  jest.restoreAllMocks();
});

describe("StewardView", () => {
  // The socket only says when to ask again; the server's answer is shown
  // (ADR 0011).
  it("fetches the active scenario again on scenario-activated and on connect", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) =>
        String(input).endsWith("/api/v1/scenario-state")
          ? response(200, activeState)
          : response(200, scenario),
      );
    const stateFetches = () =>
      fetchMock.mock.calls.filter(([input]) =>
        String(input).endsWith("/api/v1/scenario-state"),
      ).length;

    render(
      <StewardView
        token={token}
        online
        onLogout={() => undefined}
        onUnauthorized={() => undefined}
      />,
    );
    expect(await screen.findByText(scenario.name)).toBeTruthy();
    expect(stateFetches()).toBe(1);

    act(() => socket.emit("scenario-activated"));
    await waitFor(() => expect(stateFetches()).toBe(2));

    act(() => socket.emit("connect"));
    await waitFor(() => expect(stateFetches()).toBe(3));
  });
});
