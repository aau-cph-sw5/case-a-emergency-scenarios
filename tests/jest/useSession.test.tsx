import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { useSession, type SessionStore } from "../../shared/auth/use-session";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";
import type { AppSocket } from "../../shared/socket/createSocket";
import type { Session } from "../../shared/auth/session";

const API_URL = "http://localhost:4010";
function session(token: string, expiresInDays: number) {
  return {
    token,
    role: "STEWARD" as const,
    expiresAt: new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

function response(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

function SessionProbe({ store }: { store: SessionStore }) {
  const { state } = useSession({
    apiBaseUrl: API_URL,
    client: "mobile",
    store,
  });

  if (state.status === "signed-in" || state.status === "unavailable") {
    return <Text>{`${state.status}:${state.session.token}`}</Text>;
  }

  return <Text>{state.status}</Text>;
}

function RecoveryProbe({
  store,
  socket,
  client = "mobile",
}: {
  store: SessionStore;
  socket: AppSocket;
  client?: "web" | "mobile";
}) {
  const {
    state,
    restore,
    signOut,
    completeLogin,
    logoutStorageError,
    retryLogout,
  } = useSession({
    apiBaseUrl: API_URL,
    client,
    store,
  });

  useAuthenticatedSocket(
    socket,
    state.status === "signed-in" || state.status === "unavailable"
      ? state.session.token
      : undefined,
    restore,
  );

  return (
    <>
      <Text>{state.status}</Text>
      {logoutStorageError && <Text>Logout cleanup failed</Text>}
      <Text onPress={() => void retryLogout()}>Retry logout</Text>
      <Text onPress={() => void restore(true)}>Network recovered</Text>
      <Text onPress={() => void restore()}>Check session</Text>
      <Text onPress={() => void signOut()}>Sign out</Text>
      <Text onPress={() => void completeLogin(session("new-token", 30))}>
        Log in
      </Text>
    </>
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useSession", () => {
  it("signs the web client out when its socket handshake rejects a replaced token", async () => {
    const listeners = new Map<string, (value: Error) => void>();
    const socket = {
      on: jest.fn((event: string, listener: (value: Error) => void) => {
        listeners.set(event, listener);
      }),
      off: jest.fn((event: string) => {
        listeners.delete(event);
      }),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    const saved: Session = {
      ...session("operator-token", 30),
      role: "OPERATOR",
    };
    const store: SessionStore = {
      load: jest.fn(async () => saved),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(response(200, { userId: 2, role: "OPERATOR" }))
      .mockResolvedValue(response(401));
    render(
      <RecoveryProbe
        store={store}
        socket={socket as unknown as AppSocket}
        client="web"
      />,
    );
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    await act(async () => listeners.get("connect_error")?.(new Error("E0001")));
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(store.clear).toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalled();
  });
  it("warns and blocks restore when logout cannot clear storage, then retries", async () => {
    const storedSession = session("old-token", 30);
    const clear = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce(undefined);
    const store: SessionStore = {
      load: jest.fn(async () => storedSession),
      save: jest.fn(async () => undefined),
      clear,
    };
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/api/v1/auth/logout"))
          throw new Error("offline");
        return response(200, { userId: 1, role: "STEWARD" });
      });
    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    fireEvent.press(screen.getByText("Sign out"));
    await waitFor(() =>
      expect(screen.getByText("Logout cleanup failed")).toBeTruthy(),
    );
    expect(screen.getByText("signed-out")).toBeTruthy();
    expect(clear).toHaveBeenCalledTimes(1);
    const callsBeforeCheck = fetchMock.mock.calls.length;
    fireEvent.press(screen.getByText("Check session"));
    expect(fetchMock).toHaveBeenCalledTimes(callsBeforeCheck);
    await act(async () => fireEvent.press(screen.getByText("Retry logout")));
    expect(clear).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(screen.queryByText("Logout cleanup failed")).toBeNull(),
    );
    expect(clear).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/api/v1/auth/logout"),
      ),
    ).toHaveLength(2);
  });
  it("retries the saved session when a socket connects after an outage", async () => {
    const listeners = new Map<string, () => void>();
    const socket = {
      on: jest.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
      }),
      off: jest.fn((event: string) => {
        listeners.delete(event);
      }),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    const saved = session("old-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => saved),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };
    jest
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("server unavailable"))
      .mockResolvedValue(response(200, { userId: 1, role: "STEWARD" }));

    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() => expect(screen.getByText("unavailable")).toBeTruthy());
    expect(socket.auth).toEqual({ token: "old-token" });
    expect(socket.connect).toHaveBeenCalledTimes(1);
    await act(async () => listeners.get("connect")?.());
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("does not restore a session after logout begins", async () => {
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    const storedSession = session("old-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => storedSession),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };
    let finishCheck: ((value: Response) => void) | undefined;
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/api/v1/auth/logout")) return response(204);
        if (
          fetchMock.mock.calls.filter(([url]) =>
            String(url).endsWith("/api/v1/me"),
          ).length === 1
        ) {
          return response(200, { userId: 1, role: "STEWARD" });
        }
        return new Promise<Response>((resolve) => {
          finishCheck = resolve;
        });
      });

    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    expect(socket.connect).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("Check session"));
    await waitFor(() => expect(finishCheck).toBeDefined());
    fireEvent.press(screen.getByText("Sign out"));

    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(socket.disconnect).toHaveBeenCalled();

    await act(async () =>
      finishCheck?.(response(200, { userId: 1, role: "STEWARD" })),
    );
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    await waitFor(() => expect(store.clear).toHaveBeenCalledTimes(2));
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("does not clear a new login while an earlier logout finishes", async () => {
    let stored: Session | null = session("old-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => stored),
      save: jest.fn(async (value) => {
        stored = value;
      }),
      clear: jest.fn(async () => {
        stored = null;
      }),
    };
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    let finishCheck: ((value: Response) => void) | undefined;
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/api/v1/auth/logout")) return response(204);
        if (
          fetchMock.mock.calls.filter(([url]) =>
            String(url).endsWith("/api/v1/me"),
          ).length === 1
        ) {
          return response(200, { userId: 1, role: "STEWARD" });
        }
        return new Promise<Response>((resolve) => {
          finishCheck = resolve;
        });
      });

    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    fireEvent.press(screen.getByText("Check session"));
    await waitFor(() => expect(finishCheck).toBeDefined());
    fireEvent.press(screen.getByText("Sign out"));
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    fireEvent.press(screen.getByText("Log in"));
    expect(store.save).not.toHaveBeenCalled();
    await act(async () =>
      finishCheck?.(response(200, { userId: 1, role: "STEWARD" })),
    );
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    expect(stored?.token).toBe("new-token");
  });

  it("retries after an in-flight restore when the network returns", async () => {
    const storedSession = session("old-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => storedSession),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };
    let failFirstRequest: ((error: Error) => void) | undefined;
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            failFirstRequest = reject;
          }),
      )
      .mockImplementation(async () =>
        response(200, { userId: 1, role: "STEWARD" }),
      );

    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText("Network recovered"));

    await act(async () => {
      failFirstRequest?.(new Error("connection lost"));
    });

    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a valid session signed in when renewal fails", async () => {
    const oldSession = session("old-token", 1);
    const store: SessionStore = {
      load: jest.fn(async () => oldSession),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/api/v1/me")) {
          return response(200, { userId: 1, role: "STEWARD" });
        }

        throw new Error("renewal timed out");
      });

    render(<SessionProbe store={store} />);

    await waitFor(() => {
      expect(screen.getByText("signed-in:old-token")).toBeTruthy();
    });

    expect(store.clear).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a renewed session in memory when saving it fails", async () => {
    const oldSession = session("old-token", 1);
    const renewedSession = session("renewed-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => oldSession),
      save: jest.fn(async () => {
        throw new Error("secure storage unavailable");
      }),
      clear: jest.fn(async () => undefined),
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/api/v1/me")) {
          return response(200, { userId: 1, role: "STEWARD" });
        }

        return response(200, renewedSession);
      });

    render(<SessionProbe store={store} />);

    await waitFor(() => {
      expect(screen.getByText("signed-in:renewed-token")).toBeTruthy();
    });

    expect(store.save).toHaveBeenCalledWith(renewedSession);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("revalidates the in-memory renewed token when saving it fails", async () => {
    const oldSession = session("old-token", 1);
    const renewedSession = session("renewed-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => oldSession),
      save: jest.fn(async () => {
        throw new Error("storage unavailable");
      }),
      clear: jest.fn(async () => undefined),
    };
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input, options) => {
        if (String(input).endsWith("/api/v1/auth/renew"))
          return response(200, renewedSession);
        const headers = options?.headers as Record<string, string>;
        if (
          headers.Authorization === "Bearer old-token" &&
          fetchMock.mock.calls.length > 1
        )
          return response(401);
        return response(200, { userId: 1, role: "STEWARD" });
      });
    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() =>
      expect(socket.auth).toEqual({ token: "renewed-token" }),
    );
    fireEvent.press(screen.getByText("Check session"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(
      (fetchMock.mock.calls[2][1]?.headers as Record<string, string>)
        .Authorization,
    ).toBe("Bearer renewed-token");
    expect(store.clear).not.toHaveBeenCalled();
    expect(screen.getByText("signed-in")).toBeTruthy();
  });

  it("retries saving a renewed token when storage becomes available", async () => {
    const original = session("old-token", 1);
    const renewed = session("renewed-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => original),
      save: jest
        .fn<(value: Session) => Promise<void>>()
        .mockRejectedValueOnce(new Error("storage unavailable"))
        .mockResolvedValueOnce(undefined),
      clear: jest.fn(async () => undefined),
    };
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) =>
        String(input).endsWith("/api/v1/auth/renew")
          ? response(200, renewed)
          : response(200, { userId: 1, role: "STEWARD" }),
      );
    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() =>
      expect(socket.auth).toEqual({ token: "renewed-token" }),
    );
    fireEvent.press(screen.getByText("Check session"));
    await waitFor(() => expect(store.save).toHaveBeenCalledTimes(2));
    expect(store.save).toHaveBeenLastCalledWith(renewed);
  });

  it("revokes the replacement if logout occurs during renewal", async () => {
    const original = session("old-token", 1);
    const replacement = session("renewed-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => original),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      auth: {},
    };
    let finishRenewal: ((value: Response) => void) | undefined;
    let renewals = 0;
    const revoked: string[] = [];
    jest.spyOn(global, "fetch").mockImplementation(async (input, options) => {
      if (String(input).endsWith("/api/v1/auth/logout")) {
        revoked.push(
          (options?.headers as Record<string, string>).Authorization,
        );
        return response(204);
      }
      if (String(input).endsWith("/api/v1/auth/renew")) {
        renewals++;
        if (renewals === 1) return response(204);
        return new Promise<Response>((resolve) => {
          finishRenewal = resolve;
        });
      }
      return response(200, { userId: 1, role: "STEWARD" });
    });
    render(
      <RecoveryProbe store={store} socket={socket as unknown as AppSocket} />,
    );
    await waitFor(() => expect(screen.getByText("signed-in")).toBeTruthy());
    fireEvent.press(screen.getByText("Check session"));
    await waitFor(() => expect(finishRenewal).toBeDefined());
    fireEvent.press(screen.getByText("Sign out"));
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(revoked).toEqual(["Bearer old-token"]);
    await act(async () => finishRenewal?.(response(200, replacement)));
    await waitFor(() =>
      expect(revoked).toEqual(["Bearer old-token", "Bearer renewed-token"]),
    );
    expect(store.save).not.toHaveBeenCalled();
  });
});
