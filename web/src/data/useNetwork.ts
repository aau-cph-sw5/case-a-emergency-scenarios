import { useCallback, useEffect, useState } from "react";
import {
  buildMapNetwork,
  isNetwork,
  type MapNetwork,
} from "../../../shared/network/network";
import { getJson, userMessage } from "../get-json";

type Result =
  | { token: string; attempt: number; network: MapNetwork }
  | { token: string; attempt: number; error: string };

export function useNetwork(token: string): {
  network: MapNetwork | null;
  error: string | null;
  retry: () => void;
} {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    getJson("/api/v1/network", token, isNetwork, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setResult({ token, attempt, network: buildMapNetwork(data) });
      },
      (reason: unknown) => {
        if (!controller.signal.aborted)
          setResult({ token, attempt, error: userMessage(reason) });
      },
    );
    return () => controller.abort();
  }, [token, attempt]);

  if (!result || result.token !== token || result.attempt !== attempt) {
    return { network: null, error: null, retry };
  }
  return "network" in result
    ? { network: result.network, error: null, retry }
    : { network: null, error: result.error, retry };
}
