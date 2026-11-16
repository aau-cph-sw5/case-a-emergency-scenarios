import { useEffect, useState } from "react";
import { getJson } from "../../../shared/api/http";
import {
  buildMapNetwork,
  isNetwork,
  type MapNetwork,
} from "../../../shared/network/network";
import { apiBaseUrl } from "../api-base-url";
import { networkStore } from "./network-store";

// Keep the last usable network for the steward's existing offline map.
export function useNetwork(
  token: string,
  online: boolean,
): { network: MapNetwork | null; usingCached: boolean } {
  const [network, setNetwork] = useState<MapNetwork | null>(null);
  const [usingCached, setUsingCached] = useState(false);
  useEffect(() => {
    let wanted = true;
    async function load() {
      try {
        const cached = await networkStore.load();
        if (wanted && cached) {
          setNetwork(buildMapNetwork(cached));
          setUsingCached(true);
        }
      } catch {
        // Storage can be unavailable; still try to load the live network.
      }
      if (!online || !wanted) return;
      try {
        const live = await getJson(
          apiBaseUrl,
          "/api/v1/network",
          token,
          isNetwork,
        );
        if (!wanted) return;
        const mapped = buildMapNetwork(live);
        if (mapped.incomplete) return;
        setNetwork(mapped);
        setUsingCached(false);
        await networkStore.save(live);
      } catch {
        // Continue using the saved network when the server is unavailable.
      }
    }
    void load();
    return () => {
      wanted = false;
    };
  }, [token, online]);
  return { network, usingCached };
}
