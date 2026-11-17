import { useEffect, useState } from "react";
import { getJson } from "../../../shared/api/http";
import {
  buildMapNetwork,
  isNetwork,
  type MapNetwork,
} from "../../../shared/network/network";
import { apiBaseUrl } from "../api-base-url";
import { networkStore } from "./network-store";

export type NetworkStatus =
  "loading" | "ready" | "offline" | "incomplete" | "error";

type NetworkState = {
  network: MapNetwork | null;
  usingCached: boolean;
  status: NetworkStatus;
};

export function useNetwork(token: string, online: boolean): NetworkState {
  const [state, setState] = useState<NetworkState>({
    network: null,
    usingCached: false,
    status: "loading",
  });
  useEffect(() => {
    let wanted = true;
    async function load() {
      try {
        const cached = await networkStore.load();
        if (wanted && cached) {
          setState((current) =>
            current.network
              ? current
              : {
                  ...current,
                  network: buildMapNetwork(cached),
                  usingCached: true,
                },
          );
        }
      } catch {
        // Storage can be unavailable; still try to load the live network.
      }
      if (!wanted) return;
      if (!online) {
        setState((current) => ({ ...current, status: "offline" }));
        return;
      }
      setState((current) => ({ ...current, status: "loading" }));
      try {
        const live = await getJson(
          apiBaseUrl,
          "/api/v1/network",
          token,
          isNetwork,
        );
        if (!wanted) return;
        const mapped = buildMapNetwork(live);
        if (mapped.incomplete) {
          setState((current) => ({ ...current, status: "incomplete" }));
          return;
        }
        setState({ network: mapped, usingCached: false, status: "ready" });
        // A storage failure should not hide a usable live network.
        await networkStore.save(live).catch(() => undefined);
      } catch {
        if (wanted) setState((current) => ({ ...current, status: "error" }));
      }
    }
    void load();
    return () => {
      wanted = false;
    };
  }, [token, online]);
  return state;
}
