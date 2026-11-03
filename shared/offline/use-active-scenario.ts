import { useCallback, useEffect, useRef, useState } from "react";
import { HttpError } from "../api/http";
import { userIdFromToken } from "../auth/login";
import { loadActiveScenario } from "../scenario/active-scenario";
import { reasonFor, type CopyReason } from "./copy-reason";
import {
  buildSnapshot,
  type ScenarioSnapshot,
  type SnapshotStore,
} from "./scenario-snapshot";

export type ActiveScenarioView =
  | { status: "loading" }
  | { status: "none" }
  | { status: "stood-down"; scenarioName: string }
  | { status: "live"; snapshot: ScenarioSnapshot; notice?: LiveNotice }
  | { status: "copy"; snapshot: ScenarioSnapshot; reason: CopyReason }
  | { status: "no-copy"; reason: CopyReason };

export type LiveNotice =
  { kind: "activated" } | { kind: "switched"; from: string };

// A different scenario than the one shown was switched to. 
// or one that arrives after this session saw no scenario was activated.
function noticeFor(
  shown: ActiveScenarioView,
  previous: { scenarioId: string; name: string } | null,
  scenarioId: string,
): LiveNotice | undefined {
  if (previous !== null && previous.scenarioId !== scenarioId) {
    return { kind: "switched", from: previous.name };
  }
  if (shown.status === "none" || shown.status === "stood-down") {
    return { kind: "activated" };
  }
  if (
    shown.status === "live" &&
    shown.snapshot.scenario.scenarioId === scenarioId
  ) {
    return shown.notice;
  }
  return undefined;
}

type UseActiveScenarioOptions = {
  apiBaseUrl: string;
  token: string;
  // False when the phone has no connection or the session could not be
  // confirmed: the saved copy is shown at once, without a request.
  online: boolean;
  store: SnapshotStore;
  // The server refused the token; the caller restores the session.
  onUnauthorized: () => void;
};

// The active scenario for the steward view (MET-A-005). While a scenario is
// active every fetch replaces the saved copy; with none the copy is removed.
// Offline, or when the fetch fails, the saved copy is shown with the reason.
export function useActiveScenario({
  apiBaseUrl,
  token,
  online,
  store,
  onUnauthorized,
}: UseActiveScenarioOptions) {
  const [view, setView] = useState<ActiveScenarioView>({ status: "loading" });
  // Only the newest refresh may update the view, so a slow older answer
  // cannot overwrite a newer one.
  const latestRunRef = useRef(0);
  const shownSequenceRef = useRef(0);
  // The scenario last shown
  const shownRef = useRef<{ scenarioId: string; name: string } | null>(null);
  const onUnauthorizedRef = useRef(onUnauthorized);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  });

  const refresh = useCallback(async (): Promise<void> => {
    const run = ++latestRunRef.current;
    const isLatest = () => run === latestRunRef.current;
    // Read from the token, so it is known without a request. A token we
    // cannot read never shows or saves a copy, so no other steward's copy
    // is shown.
    const userId = userIdFromToken(token);

    async function showSavedCopy(reason: CopyReason) {
      let copy: ScenarioSnapshot | null;
      try {
        copy = userId === null ? null : await store.load(userId);
      } catch {
        copy = null;
      }
      if (!isLatest()) return;
      if (copy) {
        shownRef.current = {
          scenarioId: copy.scenario.scenarioId,
          name: copy.scenario.name,
        };
      }
      setView(
        copy
          ? { status: "copy", snapshot: copy, reason }
          : { status: "no-copy", reason },
      );
    }

    // The scenario this steward had: the one shown in this session, or the
    // saved copy when the app was just opened.
    async function previouslyShown() {
      if (shownRef.current !== null || userId === null) return shownRef.current;
      const copy = await store.load(userId).catch(() => null);
      return copy
        ? { scenarioId: copy.scenario.scenarioId, name: copy.scenario.name }
        : null;
    }

    if (!online) {
      await showSavedCopy("offline");
      return;
    }
    try {
      const active = await loadActiveScenario(apiBaseUrl, token);
      if (!isLatest()) return;
      // Checked right before writing, so a view that has closed (e.g. after
      // logging out) does not write the copy back.
      if (!active.active) {
        const previous = await previouslyShown();
        if (!isLatest()) return;
        shownRef.current = null;
        setView((shown) =>
          previous !== null
            ? { status: "stood-down", scenarioName: previous.name }
            : shown.status === "stood-down"
              ? shown
              : { status: "none" },
        );
        await store.clear().catch(() => undefined);
        return;
      }
      if (active.state.sequence < shownSequenceRef.current) return;
      const previous = await previouslyShown();
      if (!isLatest()) return;
      shownSequenceRef.current = active.state.sequence;
      const snapshot = buildSnapshot(active, userId ?? "", new Date());
      const { scenarioId, name } = snapshot.scenario;
      shownRef.current = { scenarioId, name };
      setView((shown) => ({
        status: "live",
        snapshot,
        notice: noticeFor(shown, previous, scenarioId),
      }));
      // A failing save keeps the live view; the next refresh tries again.
      if (userId !== null) await store.save(snapshot).catch(() => undefined);
    } catch (error) {
      if (!isLatest()) return;
      if (error instanceof HttpError && error.status === 401) {
        onUnauthorizedRef.current();
      }
      await showSavedCopy(reasonFor(error));
    }
  }, [apiBaseUrl, online, store, token]);

  useEffect(() => {
    const latestRun = latestRunRef;
    void Promise.resolve().then(refresh);
    return () => {
      // Drops the answer of a refresh still in flight.
      latestRun.current++;
    };
  }, [refresh]);

  // Hides the stood-down, activated or switched notice once the steward has seen it.
  const dismissNotice = useCallback(() => {
    setView((shown) =>
      shown.status === "stood-down"
        ? { status: "none" }
        : shown.status === "live"
          ? { ...shown, notice: undefined }
          : shown,
    );
  }, []);

  return { view, refresh, dismissNotice };
}
