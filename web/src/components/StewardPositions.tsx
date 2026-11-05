import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors, palette, text } from "../../../shared/Theme";
import type { ActiveDeployments } from "../../../shared/components/stationState";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { StewardStatus } from "./StewardStatus";
import { useLiveData } from "../data/liveData";

// How often the ages are recomputed, so "for 2 min siden" counts up without a
// new report.
const TICK_MS = 15_000;

type StewardPosition = {
  staff: string;
  station: string;
  status: ScenarioState["deployments"][number]["status"];
  // When the steward reported, or arrived once the station is manned.
  time?: string | null;
};

// One row per steward with a deployment, across every active activation, oldest
// first so the list reads like a log. The server counts a steward at one
// station at a time, so a deployment with staff is that steward's current
// position.
export function stewardPositions(
  activations: ActiveDeployments[],
): StewardPosition[] {
  return activations
    .flatMap((activation) => activation.deployments)
    .filter((d) => d.staff !== null && d.staff !== undefined)
    .map((d) => ({
      // String() because the server sends the numeric userId today, although
      // the contract says string.
      staff: String(d.staff),
      station: d.fulfills,
      status: d.status,
      time:
        d.status === "MANNED" ? (d.arrivedAt ?? d.reportedAt) : d.reportedAt,
    }))
    .sort(
      (a, b) =>
        // Rows without a time (no report yet) go last, not first.
        (a.time ? 0 : 1) - (b.time ? 0 : 1) ||
        (a.time ?? "").localeCompare(b.time ?? "") ||
        a.staff.localeCompare(b.staff, "da"),
    );
}

// How long ago the steward reported or arrived, as the operator reads it.
export function formatAge(time: string | null | undefined, now: number) {
  const parsed = time ? Date.parse(time) : Number.NaN;
  if (Number.isNaN(parsed)) return "ingen rapport";
  // A phone clock ahead of the server's would give a negative age.
  const minutes = Math.max(0, Math.floor((now - parsed) / 60_000));
  if (minutes < 1) return "lige nu";
  if (minutes < 60) return `for ${minutes} min siden`;
  return `for ${Math.floor(minutes / 60)} t ${minutes % 60} min siden`;
}

// The current time, updated every intervalMs, so the component re-renders and
// its ages move on.
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// The status pop-up in the bottom right corner: a button that opens a list of
// where each steward is. Stewards are shown by user id, because Metro avoids
// identifying them by name.
export function StewardPositions() {
  const { activations, isConnected, error } = useLiveData();
  const [open, setOpen] = useState(false);
  const now = useNow(TICK_MS);
  const positions = stewardPositions(activations);

  return (
    <View aria-label="Status" style={{ alignItems: "flex-end" }}>
      {open && (
        <View
          style={{
            alignSelf: "stretch",
            marginBottom: 8,
            overflow: "hidden",
            borderRadius: 8,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: palette.metroLineFour,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              backgroundColor: palette.metroLineFour,
            }}
          >
            <Text style={[text.title, { color: colors.textInverse }]}>
              Status ({positions.length})
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Luk status"
              onPress={() => setOpen(false)}
            >
              <Text style={[text.title, { color: colors.textInverse }]}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={{ padding: 12, maxHeight: 360 }}>
            {!isConnected && (
              <Text role="alert">
                Ingen forbindelse til serveren. Positionerne kan være forældede.
              </Text>
            )}
            {error !== null && (
              <Text role="alert">Kunne ikke hente positioner: {error}</Text>
            )}
            {positions.length === 0 ? (
              <Text>Ingen positioner endnu.</Text>
            ) : (
              positions.map((p) => (
                <View
                  key={`${p.staff}-${p.station}-${p.status}-${p.time}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>
                    {p.staff} | <StewardStatus status={p.status} /> |{" "}
                    {p.station}
                  </Text>
                  <Text style={{ fontSize: 14 }}>{formatAge(p.time, now)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
      {!open && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 24,
            backgroundColor: palette.metroLineFour,
          }}
        >
          <Text style={[text.title, { color: colors.textInverse }]}>
            Status ({positions.length})
          </Text>
        </Pressable>
      )}
    </View>
  );
}
