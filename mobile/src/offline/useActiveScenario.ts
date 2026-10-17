import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { userIdFromToken } from "../../../shared/auth/login";
import {
  COPY_MESSAGES,
  reasonFor,
  type CopyReason,
} from "../../../shared/offline/copy-reason";
import {
  buildSnapshot,
  type ScenarioSnapshot,
} from "../../../shared/offline/scenario-snapshot";
import { loadActiveScenario } from "../../../shared/scenario/active-scenario";
import { apiBaseUrl } from "../api-base-url";
import { snapshotStore } from "./snapshot-store";

export type ActiveScenarioView =
  | { status: "loading" }
  | { status: "none" }
  | { status: "live"; snapshot: ScenarioSnapshot }
  | { status: "copy"; snapshot: ScenarioSnapshot; reason: CopyReason }
  | { status: "unavailable"; message: string };

// Fetches the active scenario when the view opens, whenever the app comes
// back to the foreground and whenever the connection changes. While a
// scenario is active every fetch is saved on the phone; with no active
// scenario the old copy is removed. Without a connection, or if the fetch
// fails, the saved copy is shown with the reason (MET-A-005).
// With token null (opened offline, before login) only the saved copy is read.
export function useActiveScenario(
  token: string | null,
  online: boolean | null,
): ActiveScenarioView {
  const [view, setView] = useState<ActiveScenarioView>({ status: "loading" });
  // Only the newest refresh may write, so a slow older answer cannot
  // overwrite a newer one.
  const latestRefreshRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    // Read from the token, so it is known without a request.
    const userId = token === null ? undefined : userIdFromToken(token);

    async function showSavedCopy(isLatest: () => boolean, reason: CopyReason) {
      let copy: ScenarioSnapshot | null = null;
      // A token we cannot read must not show another steward's copy.
      if (userId !== null) {
        try {
          copy = await snapshotStore.load(userId);
        } catch {
          copy = null;
        }
      }
      if (!isLatest()) return;
      setView(
        copy
          ? { status: "copy", snapshot: copy, reason }
          : { status: "unavailable", message: COPY_MESSAGES[reason] },
      );
    }

    async function refresh() {
      const run = ++latestRefreshRef.current;
      const isLatest = () => !cancelled && run === latestRefreshRef.current;

      // No connection: show the copy at once instead of waiting for the
      // request to time out.
      if (
        token === null ||
        userId === null ||
        userId === undefined ||
        online === false
      ) {
        await showSavedCopy(isLatest, "offline");
        return;
      }
      try {
        const active = await loadActiveScenario(apiBaseUrl, token);
        if (!isLatest()) return;
        if (!active.active) {
          setView({ status: "none" });
          await snapshotStore.clear().catch(() => undefined);
          return;
        }
        const snapshot = buildSnapshot(active, userId, new Date());
        setView({ status: "live", snapshot });
        // A failing save keeps the live view; the next refresh tries again.
        await snapshotStore.save(snapshot).catch(() => undefined);
      } catch (error) {
        await showSavedCopy(isLatest, reasonFor(error));
      }
    }

    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [token, online]);

  return view;
}
