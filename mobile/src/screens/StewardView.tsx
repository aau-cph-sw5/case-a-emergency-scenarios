import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
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
import { animateNextLayout } from "../motion";
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
import {
  stationMessageDelivery,
  stationMessageQueueStore,
} from "../offline/station-message-store";
import { reportRejection, waitingReport } from "../offline/waiting-report";
import { socket } from "../socket";
import { liveNotices, NoticeStack, stoodDownNotice } from "./Notice";
import { OfflineBanner } from "./OfflineBanner";
import { withOwnStatus } from "./own-assignment";
import { RoleView } from "./RoleView";
import { StationChat } from "./StationChat";
import {
  oneRowPerStation,
  ScenarioMap,
  ScenarioOverview,
} from "./ScenarioOverview";
import { useNetwork } from "../network/useNetwork";

// Shown on the saved copy, where only going on the way can be reported.
const STATUS_BLOCKED_OFFLINE =
  "Uden forbindelse kan du kun melde dig på vej. Du ser den gemte kopi.";

// Shown while a report waits on the phone, so a later change cannot overtake it.
const STATUS_BLOCKED_WAITING =
  "Din position er ikke sendt endnu. Du kan ændre status, når den er modtaget.";

// Why the chat is gone, shown in a chat that was open (MET-A-029, #335).
const CHAT_CLOSED_STOOD_DOWN = "Scenariet er afsluttet.";
const CHAT_CLOSED_CHECKED_OUT = "Du er ikke længere tjekket ind på stationen.";

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
  const { isConnected } = useSocketState(socket);
  const {
    network,
    usingCached,
    status: networkStatus,
  } = useNetwork(token, online);
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
  // The station chosen in the list, assigned by the BEKRÆFT slide (#376).
  const [selected, setSelected] = useState<string | undefined>(undefined);
  // The station just cancelled keeps its place at the top of the list until
  // the steward picks again, so it does not jump away (#376).
  const [pinned, setPinned] = useState<string | undefined>(undefined);

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
  // Whether the steward's own status for this activation has been read, so
  // the app's own status may be counted in the numbers (withOwnStatus).
  const [ownLoaded, setOwnLoaded] = useState(false);
  if (statusKey !== shownStatusKey) {
    setShownStatusKey(statusKey);
    setOwnLoaded(false);
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
      setOwnLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [token, activationId, userId, deployments]);

  // Sends the queued reports and says what went wrong, null when nothing did.
  // A report that went through says nothing (#376): the status box already
  // shows the new status, so "Position sendt." was noise. delivered tells
  // that something went through, so an old problem message can go.
  const deliver = useCallback(async (): Promise<{
    message: string | null;
    blocked: boolean;
    delivered: boolean;
  }> => {
    // From the token, since a stopped scenario leaves no snapshot.
    const owner = userIdFromToken(token);
    if (owner === null)
      return { message: null, blocked: false, delivered: false };
    // Station messages written offline go out at the same time (MET-A-029).
    // The chat shows how each one went; here a stopped send only makes the
    // retry below try again.
    const messagesBlocked = stationMessageDelivery.flush(owner, token).then(
      (result) => result.blocked,
      () => true,
    );
    try {
      const result = await positionReportDelivery.flush(owner, token);
      const refused =
        result.rejected > result.superseded.length
          ? "Positionen blev ikke modtaget."
          : null;
      // A delivered or refused report changes the server's copy, so it is fetched again.
      if (result.acknowledged > 0 || result.rejected > 0) void refresh();
      const lines = [supersededMessage(result.superseded), refused].filter(
        (line) => line !== null,
      );
      return {
        message: lines.length > 0 ? lines.join("\n") : null,
        blocked: result.blockedBy !== undefined || (await messagesBlocked),
        delivered: result.acknowledged > 0,
      };
    } catch {
      return {
        message: "Position gemt på telefonen, men kunne ikke sendes endnu.",
        blocked: true,
        delivered: false,
      };
    }
  }, [token, refresh]);

  // The activation the server says is live, null when it says none is, and
  // undefined while that is not known (loading or offline).
  const liveActivationId =
    view.status === "live"
      ? view.snapshot.state.activationId
      : view.status === "stood-down" || view.status === "none"
        ? null
        : undefined;
  // A stood-down scenario's thread is removed, so the messages the server
  // refused for it are forgotten on the phone instead of piling up (MET-A-029).
  useEffect(() => {
    const owner = userIdFromToken(token);
    if (owner === null || liveActivationId === undefined) return;
    void stationMessageQueueStore
      .discardEndedRejections(owner, liveActivationId)
      .catch(() => undefined);
  }, [token, liveActivationId]);

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
      void deliver().then(({ message, blocked, delivered }) => {
        if (isCancelled()) return;
        if (message !== null) setReportStatus(message);
        else if (delivered) setReportStatus(null);
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
      // Saved on the phone; the status box shows the steward on the way.
      setReportStatus(null);
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
    setReportStatus(message);
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
      if (result.ok) {
        // The status card turns by itself, and the list under it takes the
        // new status when the card shows its new face (StewardStatusControl).
        setOwnStatus(result.own);
        setSelected(undefined);
        setPinned(change.type === "cancel" ? ownStation : undefined);
      } else setStatusError(result.message);
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
  // A station is chosen only while the steward has none: on the way they
  // cancel first (the cross in the status card), and after arriving they
  // check out first.
  // A chosen station that a new copy of the scenario no longer has is
  // dropped, so the slide cannot assign a station that is not there.
  const chosen =
    selected !== undefined &&
    (shown?.scenario.versions[0]?.stationRequirements ?? []).some(
      (row) => row.station === selected,
    )
      ? selected
      : undefined;
  // Not tied to sending: while an assignment is sent the BEKRÆFT slide and
  // the rows stay as they are (the slide is blocked by sending, and
  // changeStatus refuses a second change), so nothing on the screen jumps.
  const canPick =
    (view.status === "live" || view.status === "copy") &&
    ownStation === undefined;

  // The scenario with the steward's own status counted at once (#376), so the
  // numbers do not show an old value and jump when the server's next copy
  // arrives. Before the own status has been read, the server's copy as it is.
  const counted =
    shown && ownLoaded
      ? {
          ...shown,
          state: {
            ...shown.state,
            deployments: withOwnStatus(
              shown.state.deployments,
              shown.userId,
              own,
            ),
          },
        }
      : shown;

  // The coverage of the steward's station, with the own status counted.
  // The station the status card shows the staffing of: the own station, or
  // without one the station chosen in the list, so the steward sees how it
  // is staffed before sliding BEKRÆFT (#376).
  const cardStation = ownStation ?? chosen;
  const cardRequirement =
    cardStation && shown
      ? // All rows of the station together, as in the list (#376).
        oneRowPerStation(
          shown.scenario.versions[0]?.stationRequirements ?? [],
        ).find((requirement) => requirement.station === cardStation)
      : undefined;
  const cardCoverage =
    cardStation && shown && cardRequirement
      ? (() => {
          const state = getStationState(
            (counted ?? shown).state,
            cardStation,
            cardRequirement.minimumStaffing,
          );
          return {
            arrived: state.current,
            enRoute: state.enRoute,
            needed: cardRequirement.minimumStaffing,
          };
        })()
      : null;

  const stoodDown = stoodDownNotice(view);

  const retry = onRetry ?? (() => void refresh());

  // The station's chat is there only while the steward is checked in
  // (ARRIVED) at it, as the server requires (MET-A-029, #335).
  const chatStation = own?.status === "MANNED" ? own.station : undefined;
  const refreshScenario = useCallback(() => void refresh(), [refresh]);
  // While the chat is open it covers the view, which a screen reader skips.
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <RoleView title="Steward" onLogout={onLogout} obscured={chatOpen}>
      {/* Activated and switched show over the screen and move nothing;
          stood down turns the status card (closed, below). */}
      <NoticeStack
        notices={liveNotices(view)}
        onDismiss={(id) => {
          animateNextLayout();
          dismissNotice(id);
        }}
      />
      {/* The screen does not scroll (#376): the status card at the top (the
          status, the map and the one control), the station list under it. */}
      <View
        style={styles.content}
        accessibilityElementsHidden={chatOpen}
        importantForAccessibility={chatOpen ? "no-hide-descendants" : "auto"}
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
        {(shown || stoodDown) && (
          <StewardStatusControl
            closed={
              stoodDown
                ? {
                    title: stoodDown.title,
                    text: stoodDown.text,
                    onDismiss: () => dismissNotice(),
                  }
                : undefined
            }
            own={own}
            coverage={cardCoverage}
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
            onAssign={
              canPick
                ? () =>
                    chosen !== undefined &&
                    void changeStatus({ type: "assign", station: chosen })
                : undefined
            }
            selected={chosen}
            onCheckOut={() => void changeStatus({ type: "checkOut" })}
            onCancel={() => void changeStatus({ type: "cancel" })}
            cancelDisabled={
              sendingStatus || view.status !== "live" || waiting !== null
            }
            offline={view.status === "copy"}
            ready={ownLoaded}
            scenario={shown?.scenario.name}
            connected={online && isConnected}
            map={
              shown && (
                <ScenarioMap
                  snapshot={counted ?? shown}
                  network={network}
                  networkIsCached={usingCached}
                  networkStatus={networkStatus}
                  assignedStation={ownStation}
                  checkedOutStation={
                    own?.status === "CHECKED_OUT" ? own.station : undefined
                  }
                />
              )
            }
            note={
              reportStatus && <Text style={styles.report}>{reportStatus}</Text>
            }
          >
            {/* Part of the list, so it comes and goes with the card's
                status, not a turn ahead of it (#335). */}
            {own?.status === "PENDING" && (
              <Text style={styles.report}>
                Tjek ind på stationen for at skrive til kontrolrummet.
              </Text>
            )}
            {shown && (
              <ScenarioOverview
                snapshot={counted ?? shown}
                assignedStation={ownStation}
                checkedOutStation={
                  own?.status === "CHECKED_OUT" ? own.station : undefined
                }
                ownArrived={
                  own?.status === "MANNED" || own?.status === "TASK_DONE"
                }
                onSelect={
                  canPick
                    ? (station) => {
                        animateNextLayout();
                        setPinned(undefined);
                        setSelected(station);
                      }
                    : undefined
                }
                selected={chosen}
                pinnedStation={pinned}
              />
            )}
          </StewardStatusControl>
        )}

        {/* Without a scenario (for example after a stop) the answer about
            the reports still shows; with one, it sits above the list. */}
        {!shown && !stoodDown && reportStatus && (
          <Text style={styles.report}>{reportStatus}</Text>
        )}
      </View>
      {/* Over the whole view, header included, so it is the last child. */}
      <StationChat
        token={token}
        station={chatStation}
        activationId={activationId}
        closedReason={
          view.status === "stood-down" || view.status === "none"
            ? CHAT_CLOSED_STOOD_DOWN
            : CHAT_CLOSED_CHECKED_OUT
        }
        onClosedByServer={refreshScenario}
        onOpenChange={setChatOpen}
      />
    </RoleView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 12,
  },
  report: {
    ...text.small,
    marginBottom: 6,
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
