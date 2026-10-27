import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { palette, text } from "../../../shared/Theme";
import {
  isStale,
  type ActiveDeployments,
} from "../../../shared/components/stationState";
import { useLiveData } from "../data/liveData";

// How often the ages are recomputed, so they move without a new report.
const TICK_MS = 15_000;

type StewardPosition = {
  staff: string;
  station: string;
  reportedAt?: string | null;
};

// One row per steward with a deployment, across every active activation. The
// server counts a steward at one station at a time, so a deployment with staff
// is that steward's current position.
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
      reportedAt: d.reportedAt,
    }))
    .sort(
      (a, b) =>
        a.station.localeCompare(b.station, "da") ||
        a.staff.localeCompare(b.staff, "da"),
    );
}

export function formatAge(reportedAt: string | null | undefined, now: number) {
  const time = reportedAt ? Date.parse(reportedAt) : Number.NaN;
  if (Number.isNaN(time)) return "ingen rapport";
  // A phone clock ahead of the server's would give a negative age.
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 1) return "lige nu";
  if (minutes < 60) return `for ${minutes} min siden`;
  return `for ${Math.floor(minutes / 60)} t ${minutes % 60} min siden`;
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// Where each steward is and how old that information is. Stewards are shown
// by user id: Metro avoids identifying them by name.
export function StewardPositions() {
  const { activations, isConnected, error } = useLiveData();
  const now = useNow(TICK_MS);
  const positions = stewardPositions(activations);

  return (
    <View aria-label="Stewardpositioner" style={{ margin: 8 }}>
      <Text style={text.title}>Stewardpositioner</Text>
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
        positions.map((p) => {
          const stale = isStale(p.reportedAt, now);
          // The symbol and the word carry the state, not only the colour.
          const label = [
            stale ? "⚠" : "✓",
            p.staff,
            p.station,
            formatAge(p.reportedAt, now),
            ...(stale ? ["forældet"] : []),
          ].join(" · ");
          return (
            <Text
              key={`${p.staff}-${p.station}`}
              style={{
                color: stale ? palette.metroLineThree : palette.metroLineOne,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {label}
            </Text>
          );
        })
      )}
    </View>
  );
}
