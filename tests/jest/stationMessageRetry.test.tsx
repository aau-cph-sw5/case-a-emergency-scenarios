import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { RETRY_DELAYS_MS } from "../../mobile/src/offline/queue-delivery";
import type { MessageFlushResult } from "../../mobile/src/offline/station-message-delivery";
import {
  notifyStationMessagesChanged,
  stationMessageDelivery,
} from "../../mobile/src/offline/station-message-store";
import { useStationMessageRetry } from "../../mobile/src/offline/useStationMessageRetry";
import { useAppActive } from "../../mobile/src/useAppActive";

const mockSocketListeners = new Map<string, Set<() => void>>();
jest.mock("../../mobile/src/socket", () => ({
  socket: {
    on: (name: string, listener: () => void) => {
      if (!mockSocketListeners.has(name))
        mockSocketListeners.set(name, new Set());
      mockSocketListeners.get(name)!.add(listener);
    },
    off: (name: string, listener: () => void) => {
      mockSocketListeners.get(name)?.delete(listener);
    },
  },
}));

const mockStoreListeners = new Set<
  (result: MessageFlushResult | null) => void
>();
jest.mock("../../mobile/src/offline/station-message-store", () => ({
  onStationMessagesChanged: (
    listener: (result: MessageFlushResult | null) => void,
  ) => {
    mockStoreListeners.add(listener);
    return () => {
      mockStoreListeners.delete(listener);
    };
  },
  notifyStationMessagesChanged: (result: MessageFlushResult | null = null) => {
    for (const listener of mockStoreListeners) listener(result);
  },
  stationMessageDelivery: {
    flush: jest.fn(),
  },
}));

function emitSocket(name: string) {
  for (const listener of mockSocketListeners.get(name) ?? []) listener();
}

const payload = Buffer.from(JSON.stringify({ userId: 7 })).toString(
  "base64url",
);
const tokenA = `header.${payload}.sigA`;
const tokenB = `header.${payload}.sigB`;

const emptyResult: MessageFlushResult = {
  delivered: [],
  rejected: 0,
  pending: 0,
  blocked: false,
};

const retryBlocked: MessageFlushResult = {
  delivered: [],
  rejected: 0,
  pending: 1,
  blocked: true,
  blockedBy: { status: "retry" },
};

const unauthorizedBlocked: MessageFlushResult = {
  delivered: [],
  rejected: 0,
  pending: 1,
  blocked: true,
  blockedBy: { status: "rejected", httpStatus: 401, code: "E2001" },
};

const flushMock = jest.mocked(stationMessageDelivery.flush);

// Wires flushMock so every resolved result reaches listeners, matching the
// real station-message-store wrapper.
function mockFlushResults(...results: MessageFlushResult[]) {
  let index = 0;
  flushMock.mockImplementation(async () => {
    const result = results[Math.min(index, results.length - 1)];
    index += 1;
    notifyStationMessagesChanged(result);
    return result;
  });
}

describe("useAppActive (MET-A-029, #445)", () => {
  const originalState = AppState.currentState;
  let changeHandler: ((state: AppStateStatus) => void) | undefined;
  let removeMock: jest.Mock;
  let addListenerSpy: jest.SpiedFunction<typeof AppState.addEventListener>;

  beforeEach(() => {
    changeHandler = undefined;
    removeMock = jest.fn();
    addListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        changeHandler = listener;
        return { remove: removeMock } as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    addListenerSpy.mockRestore();
    Object.defineProperty(AppState, "currentState", {
      value: originalState,
      configurable: true,
      writable: true,
    });
  });

  it("tracks foreground and background state and removes its listener on unmount", () => {
    Object.defineProperty(AppState, "currentState", {
      value: "unknown",
      configurable: true,
      writable: true,
    });
    const { result, unmount } = renderHook(() => useAppActive());
    expect(result.current).toBe(true);

    act(() => {
      changeHandler?.("background");
    });
    expect(result.current).toBe(false);

    act(() => {
      changeHandler?.("inactive");
    });
    expect(result.current).toBe(false);

    act(() => {
      changeHandler?.("active");
    });
    expect(result.current).toBe(true);

    unmount();
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it("starts false when the app mounts in the background", () => {
    Object.defineProperty(AppState, "currentState", {
      value: "background",
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useAppActive());
    expect(result.current).toBe(false);
  });
});

describe("useStationMessageRetry (MET-A-029, #445)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSocketListeners.clear();
    mockStoreListeners.clear();
    flushMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not flush while disabled, and flushes once when enabled", async () => {
    mockFlushResults(emptyResult);
    const onUnauthorized = jest.fn();

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useStationMessageRetry({ token: tokenA, enabled, onUnauthorized }),
      { initialProps: { enabled: false } },
    );

    await act(async () => {
      emitSocket("connect");
      jest.advanceTimersByTime(60_000);
    });
    expect(flushMock).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await act(async () => {});

    expect(flushMock).toHaveBeenCalledTimes(1);
    expect(flushMock).toHaveBeenCalledWith("7", tokenA);
  });

  it("does nothing when the token has no user id", async () => {
    mockFlushResults(emptyResult);
    renderHook(() =>
      useStationMessageRetry({
        token: "not-a-jwt",
        enabled: true,
        onUnauthorized: jest.fn(),
      }),
    );
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(flushMock).not.toHaveBeenCalled();
  });

  it("retries blocked flushes with growing backoff and stops once unblocked", async () => {
    mockFlushResults(
      retryBlocked,
      retryBlocked,
      retryBlocked,
      retryBlocked,
      emptyResult,
    );
    renderHook(() =>
      useStationMessageRetry({
        token: tokenA,
        enabled: true,
        onUnauthorized: jest.fn(),
      }),
    );
    await act(async () => {});
    expect(flushMock).toHaveBeenCalledTimes(1);

    // First retry after RETRY_DELAYS_MS[0] (5s).
    await act(async () => {
      jest.advanceTimersByTime(RETRY_DELAYS_MS[0] - 1);
    });
    expect(flushMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(flushMock).toHaveBeenCalledTimes(2);

    // Second retry after RETRY_DELAYS_MS[1] (15s).
    await act(async () => {
      jest.advanceTimersByTime(RETRY_DELAYS_MS[1] - 1);
    });
    expect(flushMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(flushMock).toHaveBeenCalledTimes(3);

    // Third retry after RETRY_DELAYS_MS[2] (30s).
    await act(async () => {
      jest.advanceTimersByTime(RETRY_DELAYS_MS[2]);
    });
    expect(flushMock).toHaveBeenCalledTimes(4);

    // Fourth retry stays capped at RETRY_DELAYS_MS[2] (30s) and succeeds.
    await act(async () => {
      jest.advanceTimersByTime(RETRY_DELAYS_MS[2]);
    });
    expect(flushMock).toHaveBeenCalledTimes(5);

    // Once unblocked, no further timer retries run.
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });
    expect(flushMock).toHaveBeenCalledTimes(5);
  });

  it("schedules a retry when a chat send notifies a blocked result", async () => {
    mockFlushResults(emptyResult, emptyResult);
    renderHook(() =>
      useStationMessageRetry({
        token: tokenA,
        enabled: true,
        onUnauthorized: jest.fn(),
      }),
    );
    await act(async () => {});
    expect(flushMock).toHaveBeenCalledTimes(1);

    // The chat queued a message and its own flush was blocked.
    await act(async () => {
      notifyStationMessagesChanged(retryBlocked);
    });

    await act(async () => {
      jest.advanceTimersByTime(RETRY_DELAYS_MS[0]);
    });
    expect(flushMock).toHaveBeenCalledTimes(2);
  });

  it("flushes at once when the socket reconnects while enabled", async () => {
    mockFlushResults(retryBlocked, emptyResult);
    renderHook(() =>
      useStationMessageRetry({
        token: tokenA,
        enabled: true,
        onUnauthorized: jest.fn(),
      }),
    );
    await act(async () => {});
    expect(flushMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      emitSocket("connect");
    });
    expect(flushMock).toHaveBeenCalledTimes(2);

    // The earlier retry timer was cleared when the reconnect succeeded.
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(flushMock).toHaveBeenCalledTimes(2);
  });

  it("calls onUnauthorized once on 401 and stops timer retries until the token changes", async () => {
    mockFlushResults(unauthorizedBlocked, emptyResult);
    const onUnauthorized = jest.fn();

    const { rerender } = renderHook(
      ({ token }: { token: string }) =>
        useStationMessageRetry({ token, enabled: true, onUnauthorized }),
      { initialProps: { token: tokenA } },
    );
    await act(async () => {});

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(flushMock).toHaveBeenCalledTimes(1);

    // No timer or socket retries run with the rejected token.
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      emitSocket("connect");
      notifyStationMessagesChanged(unauthorizedBlocked);
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(flushMock).toHaveBeenCalledTimes(1);

    // Renewing the token restarts the loop and flushes at once.
    rerender({ token: tokenB });
    await act(async () => {});
    expect(flushMock).toHaveBeenCalledTimes(2);
    expect(flushMock).toHaveBeenLastCalledWith("7", tokenB);
  });

  it("stops retries while backgrounded and flushes at once on returning to active", async () => {
    let changeHandler: ((state: AppStateStatus) => void) | undefined;
    const addListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        changeHandler = listener;
        return { remove: jest.fn() } as ReturnType<
          typeof AppState.addEventListener
        >;
      });

    try {
      mockFlushResults(retryBlocked, emptyResult);
      renderHook(() => {
        const appActive = useAppActive();
        useStationMessageRetry({
          token: tokenA,
          enabled: appActive,
          onUnauthorized: jest.fn(),
        });
      });
      await act(async () => {});
      expect(flushMock).toHaveBeenCalledTimes(1);

      // Backgrounding clears the pending timer and blocks socket retries.
      act(() => {
        changeHandler?.("background");
      });
      await act(async () => {
        jest.advanceTimersByTime(60_000);
        emitSocket("connect");
      });
      expect(flushMock).toHaveBeenCalledTimes(1);

      // Returning to foreground flushes immediately.
      act(() => {
        changeHandler?.("active");
      });
      await act(async () => {});
      expect(flushMock).toHaveBeenCalledTimes(2);
    } finally {
      addListenerSpy.mockRestore();
    }
  });

  it("does not restart the loop when onUnauthorized changes identity and ignores flush errors", async () => {
    flushMock.mockRejectedValueOnce(new Error("storage failed"));
    const first = jest.fn();
    const second = jest.fn();

    const { rerender } = renderHook(
      ({ onUnauthorized }: { onUnauthorized: () => void }) =>
        useStationMessageRetry({
          token: tokenA,
          enabled: true,
          onUnauthorized,
        }),
      { initialProps: { onUnauthorized: first } },
    );
    await act(async () => {});
    expect(flushMock).toHaveBeenCalledTimes(1);

    rerender({ onUnauthorized: second });
    await act(async () => {});
    expect(flushMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      notifyStationMessagesChanged(unauthorizedBlocked);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
