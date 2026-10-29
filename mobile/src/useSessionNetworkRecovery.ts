import { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useSessionNetworkRecovery(
  hasSession: boolean,
  restoreSession: (retryAfterInFlight?: boolean) => Promise<unknown>,
) {
  const previousOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === false || state.isInternetReachable === false
          ? false
          : state.isConnected === true && state.isInternetReachable === true
            ? true
            : null;
      const wasOffline = previousOnlineRef.current === false;
      if (online === null) return;
      previousOnlineRef.current = online;

      if (hasSession && wasOffline && online) {
        void restoreSession(true);
      }
    });
  }, [hasSession, restoreSession]);
}
