import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors, palette, text } from "../../../shared/Theme";
import type { ActiveDeployments } from "../../../shared/components/stationState";
import { useLiveData } from "../data/liveData";

// How often the ages are recomputed, so "for 2 min siden" counts up without a
// new report.
const TICK_MS = 15_000;

// The word on each row. PENDING and MANNED come from the contract today. The
// other two only exist in the temporary mock below, until check-out and lost
// connection are decided.
const STATUS_LABEL = {
  PENDING: "På vej",
  MANNED: "Ankommet",
  CHECKED_OUT: "Udtjekket",
  CONNECTION_LOST: "Forbindelse mistet",
} as const;

// The dot next to the word. The word carries the meaning, the colour only helps.
const STATUS_DOT = {
  PENDING: palette.metroLineTwo,
  MANNED: palette.metroLineOne,
  CHECKED_OUT: palette.metroBlack,
  CONNECTION_LOST: palette.metroLineThree,
} as const;

type StewardPosition = {
  staff: string;
  station: string;
  status: keyof typeof STATUS_LABEL;
  // When the steward reported, or arrived once the station is manned.
  time?: string | null;
};

// TEMPORARY mock, shown while <StewardPositions mock /> is set in
// OperatorDashboard. It plays one shift: stewards check in at a station (på
// vej, then ankommet), check out when they leave, and one loses connection.
// Delete it, the `mock` prop and CHECKED_OUT / CONNECTION_LOST when the real
// statuses are decided.
const MOCK_LOG: StewardPosition[] = [
  {
    staff: "ID-123",
    status: "PENDING",
    station: "Vanløse",
    time: "2026-10-28T15:26:00",
  },
  {
    staff: "ID-314",
    status: "MANNED",
    station: "Frederiksberg",
    time: "2026-10-28T15:28:00",
  },
  {
    staff: "ID-208",
    status: "PENDING",
    station: "Forum",
    time: "2026-10-28T15:30:00",
  },
  {
    staff: "ID-123",
    status: "MANNED",
    station: "Vanløse",
    time: "2026-10-28T15:34:00",
  },
  {
    staff: "ID-208",
    status: "MANNED",
    station: "Forum",
    time: "2026-10-28T15:41:00",
  },
  {
    staff: "ID-314",
    status: "CHECKED_OUT",
    station: "Frederiksberg",
    time: "2026-10-28T15:52:00",
  },
  {
    staff: "ID-415",
    status: "PENDING",
    station: "Flintholm",
    time: "2026-10-28T15:55:00",
  },
  {
    staff: "ID-208",
    status: "CONNECTION_LOST",
    station: "Forum",
    time: "2026-10-28T15:58:00",
  },
];

// One row per steward with a deployment, across every active activation, oldest
// first so the list reads like a log. The server counts a steward at one
// station at a time, so a deployment with staff is that steward's current
// position.
export function stewardPositions(
  activations: ActiveDeployments[],
): StewardPosition[] {
  return activations
    .flatMap((activation) => activation.deployments)
    .filter(
      (d) =>
        d.staff !== null && d.staff !== undefined && d.status !== "UNMANNED",
    )
    .map((d) => ({
      // String() because the server sends the numeric userId today, although
      // the contract says string.
      staff: String(d.staff),
      station: d.fulfills,
      status: d.status as "PENDING" | "MANNED",
      time:
        d.status === "MANNED" ? (d.arrivedAt ?? d.reportedAt) : d.reportedAt,
    }))
    .sort(
      (a, b) =>
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
export function StewardPositions({ mock = false }: { mock?: boolean }) {
  const { activations, isConnected, error } = useLiveData();
  const [open, setOpen] = useState(mock);
  const now = useNow(TICK_MS);
  const positions = mock ? MOCK_LOG : stewardPositions(activations);

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
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        marginRight: 8,
                        borderRadius: 5,
                        backgroundColor: STATUS_DOT[p.status],
                      }}
                    />
                    <Text style={{ fontSize: 14 }}>
                      {p.staff} | {STATUS_LABEL[p.status]} | {p.station}
                    </Text>
                  </View>
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
