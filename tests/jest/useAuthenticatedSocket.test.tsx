import { describe, expect, it, jest } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import type { AppSocket } from "../../shared/socket/createSocket";
import { ERROR_CODES } from "../../shared/error-codes";
import type { Session } from "../../shared/auth/session";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";

function SocketProbe({
  socket,
  token,
  restoreSession,
}: {
  socket: AppSocket;
  token: string | undefined;
  restoreSession: (retryAfterInFlight?: boolean) => Promise<Session | null>;
}) {
  useAuthenticatedSocket(socket, token, restoreSession);
  return null;
}

function createTestSocket() {
  const listeners = new Map<string, (value: never) => void>();
  return {
    auth: {},
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn((_event: string, handler: (value: never) => void) => {
      listeners.set(_event, handler);
    }),
    off: jest.fn((_event: string, handler: (value: never) => void) => {
      if (listeners.get(_event) === handler) listeners.delete(_event);
    }),
    emitError(error: Error) {
      listeners.get("connect_error")?.(error as never);
    },
    emitConnect() {
      listeners.get("connect")?.(undefined as never);
    },
    emitDisconnect(reason: string) {
      listeners.get("disconnect")?.(reason as never);
    },
  };
}

describe("useAuthenticatedSocket", () => {
  it("backs off when the server repeatedly disconnects after connection", async () => {
    jest.useFakeTimers();
    try {
      const socket = createTestSocket();
      const restoreSession = jest.fn(async () => ({
        token: "token",
        role: "STEWARD" as const,
        expiresAt: "2030-01-01T00:00:00.000Z",
      }));
      const screen = render(
        <SocketProbe
          socket={socket as unknown as AppSocket}
          token="token"
          restoreSession={restoreSession}
        />,
      );
      await act(async () => socket.emitConnect());
      await act(async () => socket.emitDisconnect("io server disconnect"));
      expect(socket.connect).toHaveBeenCalledTimes(2);
      await act(async () => socket.emitConnect());
      await act(async () => socket.emitDisconnect("io server disconnect"));
      expect(socket.connect).toHaveBeenCalledTimes(2);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000);
      });
      expect(socket.connect).toHaveBeenCalledTimes(3);
      await act(async () => socket.emitConnect());
      await act(async () => socket.emitDisconnect("io server disconnect"));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(9999);
      });
      expect(socket.connect).toHaveBeenCalledTimes(3);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(socket.connect).toHaveBeenCalledTimes(4);
      screen.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
  it("revalidates a server-disconnected socket", async () => {
    const socket = createTestSocket();
    const restoreSession = jest.fn(async () => null);
    const screen = render(
      <SocketProbe
        socket={socket as unknown as AppSocket}
        token="token"
        restoreSession={restoreSession}
      />,
    );
    await act(async () => socket.emitDisconnect("io server disconnect"));
    expect(restoreSession).toHaveBeenCalledWith(true);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    screen.unmount();
  });
  it("connects after sign-in and disconnects after sign-out", () => {
    const socket = createTestSocket();
    const appSocket = socket as unknown as AppSocket;
    const restoreSession = jest.fn(async () => null);

    const screen = render(
      <SocketProbe
        socket={appSocket}
        token={undefined}
        restoreSession={restoreSession}
      />,
    );

    expect(socket.connect).not.toHaveBeenCalled();

    screen.rerender(
      <SocketProbe
        socket={appSocket}
        token="first-token"
        restoreSession={restoreSession}
      />,
    );

    expect(socket.auth).toEqual({ token: "first-token" });
    expect(socket.connect).toHaveBeenCalledTimes(1);

    screen.rerender(
      <SocketProbe
        socket={appSocket}
        token={undefined}
        restoreSession={restoreSession}
      />,
    );

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects with the renewed token", () => {
    const socket = createTestSocket();
    const appSocket = socket as unknown as AppSocket;
    const restoreSession = jest.fn(async () => null);

    const screen = render(
      <SocketProbe
        socket={appSocket}
        token="old-token"
        restoreSession={restoreSession}
      />,
    );

    screen.rerender(
      <SocketProbe
        socket={appSocket}
        token="renewed-token"
        restoreSession={restoreSession}
      />,
    );

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.auth).toEqual({ token: "renewed-token" });
    expect(socket.connect).toHaveBeenCalledTimes(2);

    screen.unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(2);
  });

  it("rechecks the session for authentication rejection but not network errors", async () => {
    const socket = createTestSocket();
    const restoreSession = jest.fn(async () => null);
    const screen = render(
      <SocketProbe
        socket={socket as unknown as AppSocket}
        token="token"
        restoreSession={restoreSession}
      />,
    );

    socket.emitError(new Error("xhr poll error"));
    expect(restoreSession).not.toHaveBeenCalled();

    await act(async () =>
      socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
    );
    expect(restoreSession).toHaveBeenCalledTimes(1);
    expect(restoreSession).toHaveBeenCalledWith(true);
    expect(socket.connect).toHaveBeenCalledTimes(1);

    screen.unmount();
    socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID));
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });

  it("reconnects once when the rejected token is still valid", async () => {
    const socket = createTestSocket();
    const restoreSession = jest.fn(async () => ({
      token: "token",
      role: "STEWARD" as const,
      expiresAt: "2030-01-01T00:00:00.000Z",
    }));
    render(
      <SocketProbe
        socket={socket as unknown as AppSocket}
        token="token"
        restoreSession={restoreSession}
      />,
    );

    await act(async () =>
      socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
    );
    expect(socket.connect).toHaveBeenCalledTimes(2);
    await act(async () =>
      socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
    );
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });

  it("rechecks a second rejection after a delay", async () => {
    jest.useFakeTimers();
    try {
      const socket = createTestSocket();
      const restoreSession = jest
        .fn<() => Promise<Session | null>>()
        .mockResolvedValueOnce({
          token: "token",
          role: "STEWARD",
          expiresAt: "2030-01-01T00:00:00.000Z",
        })
        .mockResolvedValueOnce(null);
      const screen = render(
        <SocketProbe
          socket={socket as unknown as AppSocket}
          token="token"
          restoreSession={restoreSession}
        />,
      );
      await act(async () =>
        socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
      );
      await act(async () =>
        socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
      );
      expect(restoreSession).toHaveBeenCalledTimes(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000);
      });
      expect(restoreSession).toHaveBeenCalledTimes(2);
      screen.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not reconnect after the hook is unmounted during revalidation", async () => {
    const socket = createTestSocket();
    let finish: ((session: Session | null) => void) | undefined;
    const restoreSession = jest.fn(
      () =>
        new Promise<Session | null>((resolve) => {
          finish = resolve;
        }),
    );
    const screen = render(
      <SocketProbe
        socket={socket as unknown as AppSocket}
        token="token"
        restoreSession={restoreSession}
      />,
    );
    socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID));
    screen.unmount();
    await act(async () =>
      finish?.({
        token: "token",
        role: "STEWARD",
        expiresAt: "2030-01-01T00:00:00.000Z",
      }),
    );
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("checks the session on connection and retries a temporarily unavailable API", async () => {
    jest.useFakeTimers();
    try {
      const socket = createTestSocket();
      const restoreSession = jest
        .fn<() => Promise<Session | null>>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          token: "token",
          role: "STEWARD",
          expiresAt: "2030-01-01T00:00:00.000Z",
        });
      const screen = render(
        <SocketProbe
          socket={socket as unknown as AppSocket}
          token="token"
          restoreSession={restoreSession}
        />,
      );
      await act(async () => socket.emitConnect());
      expect(restoreSession).toHaveBeenCalledTimes(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000);
      });
      expect(restoreSession).toHaveBeenCalledTimes(2);
      expect(socket.connect).toHaveBeenCalledTimes(1);
      screen.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("cancels session retries when signed out", async () => {
    jest.useFakeTimers();
    try {
      const socket = createTestSocket();
      const restoreSession = jest.fn(async () => null);
      const screen = render(
        <SocketProbe
          socket={socket as unknown as AppSocket}
          token="token"
          restoreSession={restoreSession}
        />,
      );
      await act(async () =>
        socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
      );
      screen.rerender(
        <SocketProbe
          socket={socket as unknown as AppSocket}
          token={undefined}
          restoreSession={restoreSession}
        />,
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(30000);
      });
      expect(restoreSession).toHaveBeenCalledTimes(1);
      expect(socket.connect).toHaveBeenCalledTimes(1);
      expect(socket.disconnect).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("reconnects after a rejected handshake if session verification was temporarily unavailable", async () => {
    jest.useFakeTimers();
    try {
      const socket = createTestSocket();
      const restoreSession = jest
        .fn<() => Promise<Session | null>>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          token: "token",
          role: "STEWARD",
          expiresAt: "2030-01-01T00:00:00.000Z",
        });
      const screen = render(
        <SocketProbe
          socket={socket as unknown as AppSocket}
          token="token"
          restoreSession={restoreSession}
        />,
      );
      await act(async () =>
        socket.emitError(new Error(ERROR_CODES.AUTH_TOKEN_INVALID)),
      );
      expect(socket.connect).toHaveBeenCalledTimes(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000);
      });
      expect(socket.connect).toHaveBeenCalledTimes(2);
      screen.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});
