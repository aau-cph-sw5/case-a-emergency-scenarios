import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useSessionNetworkRecovery } from "../../mobile/src/useSessionNetworkRecovery";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

function RecoveryProbe({
  hasSession,
  restoreSession,
}: {
  hasSession: boolean;
  restoreSession: () => Promise<void>;
}) {
  useSessionNetworkRecovery(hasSession, restoreSession);
  return null;
}

afterEach(() => {
  jest.resetAllMocks();
});

describe("useSessionNetworkRecovery", () => {
  it("restores a saved session once connectivity returns", () => {
    let listener: ((state: NetInfoState) => void) | undefined;
    const unsubscribe = jest.fn();
    jest.mocked(NetInfo.addEventListener).mockImplementation((callback) => {
      listener = callback;
      return unsubscribe;
    });
    const restoreSession = jest.fn(async () => undefined);
    const screen = render(
      <RecoveryProbe hasSession={true} restoreSession={restoreSession} />,
    );

    const emit = (
      isConnected: boolean | null,
      isInternetReachable: boolean | null,
    ) => listener?.({ isConnected, isInternetReachable } as NetInfoState);

    emit(false, false);
    emit(null, null);
    emit(true, null);
    expect(restoreSession).not.toHaveBeenCalled();
    emit(true, true);
    emit(true, true);
    expect(restoreSession).toHaveBeenCalledTimes(1);
    expect(restoreSession).toHaveBeenCalledWith(true);

    screen.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not restore a session after sign-out", () => {
    let listener: ((state: NetInfoState) => void) | undefined;
    jest.mocked(NetInfo.addEventListener).mockImplementation((callback) => {
      listener = callback;
      return () => undefined;
    });
    const restoreSession = jest.fn(async () => undefined);
    render(
      <RecoveryProbe hasSession={false} restoreSession={restoreSession} />,
    );

    listener?.({
      isConnected: false,
      isInternetReachable: false,
    } as NetInfoState);
    listener?.({
      isConnected: true,
      isInternetReachable: true,
    } as NetInfoState);
    expect(restoreSession).not.toHaveBeenCalled();
  });
});
