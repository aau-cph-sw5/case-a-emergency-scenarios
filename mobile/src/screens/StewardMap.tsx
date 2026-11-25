import { memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapRender from "../../../shared/MapRenderer";
import { steward } from "../../../shared/Theme";
import type { StewardMapModel } from "./steward-map-data";

type StewardMapProps = {
  model: StewardMapModel;
  viewBox: string | undefined;
};

// The SVG map for the steward preview and full-line overlay. Drawing it is the
// most expensive part of the screen, so it redraws only when what it shows
// changes.
export const StewardMap = memo(
  function StewardMap({ model, viewBox }: StewardMapProps) {
    const { mapData, required, levels, ownStation } = model;
    return (
      <MapRender
        viewBox={viewBox}
        lines={mapData.lines}
        positions={mapData.positions}
        availableSegments={mapData.availableSegments}
        ringStations={mapData.ringStations}
        colors={mapData.colors}
        blockedTracks={mapData.blockedTracks}
        showLineButtons={false}
        highlightStation={ownStation}
        // Every station the scenario needs staff at, coloured by how far it
        // is covered right now, like the dashboard (MET-A-011).
        markedStations={required.map((row) => row.station)}
        requiredStaffing={Object.fromEntries(
          required.map((row) => [row.station, row.minimumStaffing]),
        )}
        stationCoverage={levels}
      />
    );
  },
  (a, b) =>
    a.model.mapKey === b.model.mapKey &&
    a.model.levelsKey === b.model.levelsKey &&
    a.model.ownStation === b.model.ownStation &&
    a.viewBox === b.viewBox,
);

// Shared degraded-map notes for both the 21:9 preview and the full-line overlay.
export function MapNotes({
  networkIsCached,
  networkIncomplete,
  missingStretch,
  missingRoutes,
  style,
}: {
  networkIsCached: boolean;
  networkIncomplete: boolean;
  missingStretch: boolean;
  missingRoutes: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const infoNotes = [
    networkIsCached ? "Viser gemt metronetværk." : null,
    networkIncomplete ? "Det hentede metronetværk er ufuldstændigt." : null,
  ].filter((note): note is string => note !== null);
  const alerts = [
    missingStretch
      ? "Den berørte strækning kan ikke vises fuldt ud på dette kort."
      : null,
    missingRoutes ? "En eller flere ruter kan ikke vises på kortet." : null,
  ].filter((note): note is string => note !== null);

  if (infoNotes.length === 0 && alerts.length === 0) return null;

  return (
    <View style={style} pointerEvents="none">
      {infoNotes.map((note) => (
        <Text key={note} style={styles.note}>
          {note}
        </Text>
      ))}
      {alerts.map((alert) => (
        <Text key={alert} accessibilityRole="alert" style={styles.alert}>
          {alert}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    color: steward.muted,
    fontSize: 11,
    textAlign: "center",
  },
  alert: {
    color: steward.nobody,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
