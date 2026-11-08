import { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import {
  currentStations,
  getStationState,
} from "../../../shared/components/stationState";
import { ERROR_CODES } from "../../../shared/error-codes";
import { NO_COPY_MESSAGES } from "../../../shared/offline/copy-reason";
import { useActiveScenario } from "../../../shared/offline/use-active-scenario";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { colors, palette, text } from "../../../shared/Theme";
import { apiBaseUrl } from "../api-base-url";
import { sendPositionReport } from "../api/position-report";
import { StationPicker } from "../components/StationPicker";
import { StewardStatusControl } from "../components/StewardStatusControl";
import {
  stewardStatus,
  type OwnStatus,
  type StatusRequest,
} from "../data/steward-status";
import { snapshotStore } from "../offline/snapshot-store";
import { socket } from "../socket";
import { ScenarioNotice } from "./Notice";
import { OfflineBanner } from "./OfflineBanner";
import { RoleView } from "./RoleView";
import { ScenarioOverview } from "./ScenarioOverview";

// Shown instead of the status actions while the app shows the saved copy
// (MET-A-015, #263 criterion 4). Nothing is sent then.
const STATUS_BLOCKED_OFFLINE =
  "Uden forbindelse kan din status ikke ændres. Du ser den gemte kopi.";

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
  const [station, setStation] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  // The steward's own status in the active scenario (MET-A-015, #263).
  const [ownStatus, setOwnStatus] = useState<OwnStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sendingStatus, setSendingStatus] = useState(false);

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
    socket.on("connect", onChanged);
    return () => {
      subscription.remove();
      socket.off("scenario-activated", onChanged);
      socket.off("scenario-stood-down", onChanged);
      socket.off("connect", onChanged);
    };
  }, [refresh]);

  const live = view.status === "live" ? view.snapshot.scenario : null;

  // A new scenario arriving with a new scenarioid clears the old station choice.
  const scenarioId = live?.scenarioId;
  const [shownScenarioId, setShownScenarioId] = useState(scenarioId);
  if (scenarioId !== shownScenarioId) {
    setShownScenarioId(scenarioId);
    setStation("");
    setReportStatus(null);
  }

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
  if (statusKey !== shownStatusKey) {
    setShownStatusKey(statusKey);
    setOwnStatus(null);
    setStatusError(null);
  }
  // The server's deployments are the status when the app has none in memory,
  // e.g. after a reload or on another phone (#310), so a new fetch of the
  // scenario asks again.
  const deployments = shown?.state.deployments;
  useEffect(() => {
    if (activationId === undefined || userId === undefined) return;
    let cancelled = false;
    void stewardStatus(
      token,
      activationId,
      userId,
      { type: "current" },
      deployments,
    ).then((result) => {
      if (!cancelled && result.ok) setOwnStatus(result.own);
    });
    return () => {
      cancelled = true;
    };
  }, [token, activationId, userId, deployments]);

  // The stations of the active scenario's current version, for the picker.
  // Positions can only be reported while live.
  const stations = live ? currentStations(live) : [];

  // Reports the chosen station and shows the answer.
  async function reportPosition() {
    if (station === "") return;
    setReportStatus((await sendPositionReport(token, station)).message);
  }

  // Sends a status change and shows the answer. Going on the way is a
  // position report to the server (#268). Only while live: the saved copy
  // can not change status, and nothing is sent then.
  async function changeStatus(change: StatusRequest) {
    if (
      view.status !== "live" ||
      activationId === undefined ||
      userId === undefined ||
      sendingStatus
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
      );
      if (result.ok) setOwnStatus(result.own);
      else setStatusError(result.message);
      // The server has another status than the app (#310): fetch the
      // scenario again, so the status above follows the server's.
      if (!result.ok && result.code === ERROR_CODES.INVALID_STATUS_TRANSITION) {
        void refresh();
      }
    } finally {
      setSendingStatus(false);
    }
  }

  // The station the steward is on the way to or at. After checking out they
  // have none, so + comes back and nothing is highlighted.
  const ownStation =
    ownStatus && ownStatus.status !== "CHECKED_OUT"
      ? ownStatus.station
      : undefined;
  // After arriving the steward checks out before choosing a new station.
  const canAssign =
    view.status === "live" &&
    !sendingStatus &&
    ownStatus?.status !== "MANNED" &&
    ownStatus?.status !== "TASK_DONE";

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
      <ScrollView contentContainerStyle={styles.content}>
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
              own={ownStatus}
              coverage={ownCoverage}
              blockedReason={
                view.status === "copy" ? STATUS_BLOCKED_OFFLINE : null
              }
              sending={sendingStatus}
              error={statusError}
              onArrive={() => void changeStatus({ type: "arrive" })}
              onCancel={() => void changeStatus({ type: "cancel" })}
              onCheckOut={() => void changeStatus({ type: "checkOut" })}
            />
            <ScenarioOverview
              snapshot={shown}
              assignedStation={ownStation}
              onAssign={
                canAssign
                  ? (station) => void changeStatus({ type: "assign", station })
                  : undefined
              }
            />
          </>
        )}

        {online && (
          <>
            {stations.length > 0 && (
              <>
                <StationPicker
                  stations={stations}
                  selected={station}
                  onSelect={setStation}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={reportPosition}
                  disabled={station === ""}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Rapportér position</Text>
                </Pressable>
                {reportStatus && <Text>{reportStatus}</Text>}
              </>
            )}

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
