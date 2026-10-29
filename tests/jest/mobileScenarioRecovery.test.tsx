import { describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import type { AppSocket } from "../../shared/socket/createSocket";
import { useActivatedScenario } from "../../shared/socket/useActivatedScenario";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";

function SessionProbe({
  socket,
  token,
  available,
}: {
  socket: AppSocket;
  token?: string;
  available: boolean;
}) {
  const activated = useActivatedScenario(socket, token !== undefined);
  useAuthenticatedSocket(socket, token, async () => null);
  return (
    <Text>
      {available ? (activated?.scenario.name ?? "no scenario") : "unavailable"}
    </Text>
  );
}

describe("mobile scenario recovery", () => {
  it("keeps a scenario received before the session is verified and clears it on logout", () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const socket = {
      on: jest.fn((event: string, listener: (value: unknown) => void) => {
        listeners.set(event, listener);
      }),
      off: jest.fn((event: string) => {
        listeners.delete(event);
      }),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    } as unknown as AppSocket;
    const view = render(
      <SessionProbe socket={socket} token="token" available={false} />,
    );
    act(() =>
      listeners.get("scenario-activated")?.({
        scenario: { name: "Fire" },
        sentAt: "now",
      }),
    );
    view.rerender(
      <SessionProbe socket={socket} token="token" available={true} />,
    );
    expect(screen.getByText("Fire")).toBeTruthy();

    view.rerender(<SessionProbe socket={socket} available={false} />);
    view.rerender(
      <SessionProbe socket={socket} token="another-token" available={true} />,
    );
    expect(screen.getByText("no scenario")).toBeTruthy();
  });
});
