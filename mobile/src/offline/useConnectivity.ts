import { useEffect, useRef, useState } from "react";
import { Platform, ToastAndroid } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

// Stewards carry Android phones; elsewhere the offline banner is the signal.
function toast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  }
}

// Online unless the phone says it has no connection or no internet.
// isInternetReachable is null while unknown, which counts as online. A
// connection that cannot reach the server shows up as a failing request.
function isOnline(state: NetInfoState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

// Whether the phone has a connection: null until known, then true or false.
// Shows a toast when the connection is lost or comes back (MET-A-005).
export function useConnectivity(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);
  const previousRef = useRef<boolean | null>(null);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const next = isOnline(state);
      if (next === previousRef.current) return;
      if (!next) toast("Du er offline");
      else if (previousRef.current === false) toast("Du er online igen");
      previousRef.current = next;
      setOnline(next);
    });
  }, []);

  return online;
}
