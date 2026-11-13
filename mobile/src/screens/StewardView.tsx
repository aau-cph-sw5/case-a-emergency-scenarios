import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { getStationState } from "../../../shared/components/stationState";
import { userIdFromToken } from "../../../shared/auth/login";
import { ERROR_CODES } from "../../../shared/error-codes";
import { NO_COPY_MESSAGES } from "../../../shared/offline/copy-reason";
import { useActiveScenario } from "../../../shared/offline/use-active-scenario";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { colors, palette, text } from "../../../shared/Theme";
import { apiBaseUrl } from "../api-base-url";
import { reportErrorMessage } from "../api/position-report";
import { StewardStatusControl } from "../components/StewardStatusControl";
import {
  stewardStatus,
  type OwnStatus,
  type ReportSend,
  type StatusRequest,
} from "../data/steward-status";
import type { QueuedPositionReport } from "../../../shared/offline/position-report-queue";
import type { FlushResult } from "../offline/position-report-delivery";
import { positionReportDelivery } from "../offline/position-report-delivery-instance";
import { queuePositionReport } from "../offline/queue-position-report";
import { snapshotStore } from "../offline/snapshot-store";
import { reportRejection, waitingReport } from "../offline/waiting-report";
import { socket } from "../socket";
import { ScenarioNotice } from "./Notice";
import { OfflineBanner } from "./OfflineBanner";
import { RoleView } from "./RoleView";
import { ScenarioOverview } from "./ScenarioOverview";

// Shown on the saved copy, where only going on the way can be reported.
const STATUS_BLOCKED_OFFLINE =
  "Uden forbindelse kan du kun melde dig på vej. Du ser den gemte kopi.";

// Shown while a report waits on the phone, so a later change cannot overtake it.
const STATUS_BLOCKED_WAITING =
  "Din position er ikke sendt endnu. Du kan ændre status, når den er modtaget.";

// Waits before each new try after a send failed while live
export const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

// Tells the steward which queued reports were rejected because the scenario changed.
export function supersededMessage(
  reports: FlushResult["superseded"],
): string | null {
  if (reports.length === 0) return null;
  const stations = reports.map((report) => report.station).join(", ");
  return reports.length === 1
    ? `Din position ved ${stations} blev afvist, fordi scenariet blev stoppet eller skiftet, efter du sendte den.`
    : `${reports.length} positioner (${stations}) blev afvist, fordi scenariet blev stoppet eller skiftet, efter du sendte dem.`;
}

// online is false when the phone has no connection or the session could not
// be confirmed; the saved copy is shown then, and nothing is sent.
export function StewardView({
  token,
  online,
  onLogout,
  onUnauthorized,
  onRetry,
}: {
  token: string;
  online: boolean;
  onLogout: () => void;
  onUnauthorized: () => void;
  // Tries the connection again; without it the scenario is fetched again.
  onRetry?: () => void;
}) {
  // Data from the socketstate
  const { isConnected, messages } = useSocketState(socket);
  const { view, refresh, dismissNotice } = useActiveScenario({
    apiBaseUrl,
    token,
    online,
    store: snapshotStore,
    onUnauthorized,
  });
  // What happened to the reports queued on the phone.
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  // The steward's own status in the active scenario (MET-A-015, #263).
  const [ownStatus, setOwnStatus] = useState<OwnStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sendingStatus, setSendingStatus] = useState(false);
  // The page does not scroll while the arrival slide is being slid.
  const [sliding, setSliding] = useState(false);

  // Fetches again when the app returns to the foreground, when the socket
  // announces an activation or a stand-down, and when the socket reconnects,
  // so a change missed while disconnected is not lost. Each is saved as the
  // offline copy too (MET-A-005).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const onChanged = () => void refresh();
    socket.on("scenario-activated", onChanged);
    socket.on("scenario-stood-down", onChanged);
    // Another steward's report changed the coverage (#310).
    socket.on("activations-changed", onChanged);
    socket.on("connect", onChanged);
    return () => {
      subscription.remove();
      socket.off("scenario-activated", onChanged);
      socket.off("scenario-stood-down", onChanged);
      socket.off("activations-changed", onChanged);
      socket.off("connect", onChanged);
    };
  }, [refresh]);

  // The status belongs to one steward in one activation. When either
  // changes, the old status is cleared and the current one is fetched, so a
  // steward who logs in again sees the status they had, and a new activation
  // starts with no status (#263 criterion 2). The saved copy keeps its
  // activation, so the status stays while offline.
  const shown =
    view.status === "live" || view.status === "copy" ? view.snapshot : null;
  const activationId = shown?.state.activationId;
  const userId = shown?.userId;
  const statusKey =
    activationId === undefined || userId === undefined
      ? undefined
      : `${activationId}/${userId}`;
  const [shownStatusKey, setShownStatusKey] = useState(statusKey);
  // The newest report saved on the phone that the server has not received yet.
  const [waiting, setWaiting] = useState<QueuedPositionReport | null>(null);
  if (statusKey !== shownStatusKey) {
    setShownStatusKey(statusKey);
    setOwnStatus(null);
    setStatusError(null);
    setWaiting(null);
  }

  // Reads the waiting report again, none when the phone storage cannot be read.
  const checkWaiting = useCallback(async () => {
    if (activationId === undefined || userId === undefined) return;
    setWaiting(await waitingReport(userId, activationId).catch(() => null));
  }, [activationId, userId]);
  // Each new copy of the scenario carries the server's status, which replaces
  // what the app remembers, e.g. after a reload or a change from another
  // phone (#310).
  const deployments = shown?.state.deployments;
  useEffect(() => {
    if (activationId === undefined || userId === undefined) return;
    let cancelled = false;
    void Promise.all([
      stewardStatus(
        token,
        activationId,
        userId,
        { type: "current" },
        deployments,
      ),
      waitingReport(userId, activationId).catch(() => null),
    ]).then(([result, pending]) => {
      if (cancelled) return;
      if (result.ok) setOwnStatus(result.own);
      setWaiting(pending);
    });
    return () => {
      cancelled = true;
    };
  }, [token, activationId, userId, deployments]);

  // Sends the queued reports and says what happened, null when nothing changed.
  const deliver = useCallback(async (): Promise<{
    message: string | null;
    blocked: boolean;
  }> => {
    // From the token, since a stopped scenario leaves no snapshot.
    const owner = userIdFromToken(token);
    if (owner === null) return { message: null, blocked: false };
    try {
      const result = await positionReportDelivery.flush(owner, token);
      const sent =
        result.pending > 0
          ? "Position gemt. Afventer levering."
          : result.acknowledged > 0
            ? "Position sendt."
            : null;
      const refused =
        result.rejected > result.superseded.length
          ? "Positionen blev ikke modtaget."
          : null;
      // A delivered or refused report changes the server's copy, so it is fetched again.
      if (result.acknowledged > 0 || result.rejected > 0) void refresh();
      const lines = [
        supersededMessage(result.superseded),
        refused,
        sent,
      ].filter((line) => line !== null);
      return {
        message: lines.length > 0 ? lines.join("\n") : null,
        blocked: result.blockedBy !== undefined,
      };
    } catch {
      return {
        message: "Position gemt på telefonen, men kunne ikke sendes endnu.",
        blocked: true,
      };
    }
  }, [token, refresh]);

  // Failed sends in a row while online; 0 means no retry is waiting.
  const [retries, setRetries] = useState(0);
  // Also sends after a stop while offline, so the steward learns why reports were rejected.
  const canSend =
    online &&
    (view.status === "live" ||
      view.status === "stood-down" ||
      view.status === "none");
  // Coming back online sends at once, not after the last retry delay.
  const [shownCanSend, setShownCanSend] = useState(canSend);
  if (canSend !== shownCanSend) {
    setShownCanSend(canSend);
    setRetries(0);
  }

  // Sends the queue and shows the answer; a failed send waits for another try.
  const sendQueued = useCallback(
    (isCancelled: () => boolean) =>
      void deliver().then(({ message, blocked }) => {
        if (isCancelled()) return;
        if (message !== null) setReportStatus(message);
        setRetries((count) => (blocked ? count + 1 : 0));
        void checkWaiting();
      }),
    [deliver, checkWaiting],
  );

  // Delivers reports queued while offline as soon as the phone is back online.
  useEffect(() => {
    if (!canSend) return;
    let cancelled = false;
    sendQueued(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [canSend, sendQueued]);

  // While a send keeps failing, tries again after a growing delay.
  useEffect(() => {
    if (!canSend || retries === 0) return;
    let cancelled = false;
    const timer = setTimeout(
      () => sendQueued(() => cancelled),
      RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length) - 1],
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canSend, retries, sendQueued]);

  // Queues going on the way on the phone first, so it also works offline.
  const queueReport: ReportSend = async (station, event) => {
    if (!shown) return { ok: false, message: "Intet aktivt scenarie." };
    let queued: QueuedPositionReport;
    try {
      queued = await queuePositionReport({
        userId: shown.userId,
        station,
        scenarioId: shown.state.scenarioId,
        activationId: shown.state.activationId,
        event,
      });
    } catch {
      return {
        ok: false,
        message: "Positionen kunne ikke gemmes på telefonen.",
      };
    }
    if (!canSend) {
      setReportStatus("Position gemt. Afventer levering.");
      setWaiting(queued);
      return { ok: true, message: "" };
    }
    const { message, blocked } = await deliver();
    // A refused report gives no status, and the reason is shown with the status.
    const rejection = await reportRejection(shown.userId, queued.id).catch(
      () => null,
    );
    await checkWaiting();
    if (rejection !== null) {
      setReportStatus(null);
      return {
        ok: false,
        message: reportErrorMessage(rejection.code),
        ...(rejection.code === undefined ? {} : { code: rejection.code }),
      };
    }
    setReportStatus(message ?? "Position gemt. Afventer levering.");
    // A report that could not be sent now is tried again after a delay.
    if (blocked) setRetries((count) => count + 1);
    return { ok: true, message: "" };
  };

  // Sends a status change, only on the way is allowed on the saved copy.
  async function changeStatus(change: StatusRequest) {
    if (
      !(
        view.status === "live" ||
        (view.status === "copy" && change.type === "assign")
      ) ||
      activationId === undefined ||
      userId === undefined ||
      sendingStatus ||
      (waiting !== null && change.type !== "assign")
    ) {
      return;
    }
    setSendingStatus(true);
    setStatusError(null);
    try {
      const result = await stewardStatus(
        token,
        activationId,
        userId,
        change,
        deployments,
        change.type === "assign" ? queueReport : undefined,
      );
      if (result.ok) setOwnStatus(result.own);
      else setStatusError(result.message);
      // The server or the app's own check refused the change, so the app's
      // status is out of date (#310): a new copy brings the server's.
      if (!result.ok && result.code === ERROR_CODES.INVALID_STATUS_TRANSITION) {
        void refresh();
      }
    } finally {
      setSendingStatus(false);
    }
  }

  // A waiting report wins over the server's copy, which has not received it yet.
  const own: OwnStatus | null =
    waiting !== null && (waiting.event ?? "EN_ROUTE") === "EN_ROUTE"
      ? { station: waiting.station, status: "PENDING" }
      : ownStatus;
  // The station the steward is on the way to or at. After checking out they
  // have none, so + comes back and nothing is highlighted.
  const ownStation =
    own && own.status !== "CHECKED_OUT" ? own.station : undefined;
  // After arriving the steward checks out before choosing a new station.
  const canAssign =
    (view.status === "live" || view.status === "copy") &&
    !sendingStatus &&
    own?.status !== "MANNED" &&
    own?.status !== "TASK_DONE";

  // The coverage of the steward's station, from the server's deployments
  // only, so the steward sees the same as the control room.
  const ownRequirement =
    ownStation && shown
      ? shown.scenario.versions[0]?.stationRequirements?.find(
          (requirement) => requirement.station === ownStation,
        )
      : undefined;
  const ownCoverage =
    ownStation && shown && ownRequirement
      ? (() => {
          const state = getStationState(
            shown.state,
            ownStation,
            ownRequirement.minimumStaffing,
          );
          return {
            arrived: state.current,
            enRoute: state.enRoute,
            needed: ownRequirement.minimumStaffing,
          };
        })()
      : null;

  const retry = onRetry ?? (() => void refresh());

  return (
    <RoleView
      title="Steward"
      description="Logget ind som steward."
      onLogout={onLogout}
    >
      <ScenarioNotice view={view} onDismiss={dismissNotice} />
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!sliding}
      >
        {view.status === "loading" && (
          <Text style={styles.message}>Henter aktiv hændelse…</Text>
        )}
        {view.status === "none" && (
          <Text style={styles.message}>Intet aktivt scenarie</Text>
        )}
        {view.status === "no-copy" && (
          <>
            <Text style={styles.error} accessibilityRole="alert">
              {NO_COPY_MESSAGES[view.reason]}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Prøv igen</Text>
            </Pressable>
          </>
        )}
        {view.status === "copy" && (
          <OfflineBanner
            savedAt={view.snapshot.savedAt}
            reason={view.reason}
            onRetry={retry}
          />
        )}
        {shown && (
          <>
            <StewardStatusControl
              own={own}
              coverage={ownCoverage}
              blockedReason={
                view.status === "copy"
                  ? STATUS_BLOCKED_OFFLINE
                  : waiting !== null
                    ? STATUS_BLOCKED_WAITING
                    : null
              }
              sending={sendingStatus}
              error={statusError}
              onArrive={() => void changeStatus({ type: "arrive" })}
              onCancel={() => void changeStatus({ type: "cancel" })}
              onCheckOut={() => void changeStatus({ type: "checkOut" })}
              onSlidingChange={setSliding}
            />
            <ScenarioOverview
              snapshot={shown}
              assignedStation={ownStation}
              checkedOutStation={
                own?.status === "CHECKED_OUT" ? own.station : undefined
              }
              onAssign={
                canAssign
                  ? (station) => void changeStatus({ type: "assign", station })
                  : undefined
              }
            />
          </>
        )}

        {reportStatus && <Text>{reportStatus}</Text>}

        {online && (
          <>
            <Text style={isConnected ? styles.ok : styles.offline}>
              Socket: {isConnected ? "connected" : "disconnected"}
            </Text>

            {messages.map((message) => (
              <Text key={message.id}>Socket: {message.text}</Text>
            ))}
          </>
        )}
      </ScrollView>
    </RoleView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  message: {
    ...text.body,
    color: colors.text,
    fontSize: 18,
    marginBottom: 8,
  },
  error: {
    color: palette.metroDeepRed,
    fontWeight: "600",
    marginBottom: 4,
  },
  ok: {
    color: "#1b7f3b",
    fontWeight: "600",
    marginTop: 8,
  },
  offline: {
    color: "#6b7280",
    marginTop: 8,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#1b7f3b",
    borderRadius: 4,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
