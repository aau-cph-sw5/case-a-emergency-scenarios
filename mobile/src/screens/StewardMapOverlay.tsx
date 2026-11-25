import { memo, useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { LINE_GROUP_LABELS } from "../../../shared/auth/line-groups";
import { stationCoverage } from "../../../shared/components/stationState";
import MapRender from "../../../shared/MapRenderer";
import type { MapNetwork } from "../../../shared/network/network";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { areaAroundStations } from "../../../shared/scenario/affected-stations";
import {
  colors,
  coverageColors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";
import { fitViewBoxToAspect } from "./map-zoom";
import {
  deriveStewardMapModel,
  type StationRequirement,
  type StewardMapData,
} from "./steward-map-data";

const FULL_LINE_MARGIN = 90;
const STRETCH_MARGIN = 160;

// Full-screen map overlay for the steward app (MET-A-031, #467).
// Shows the whole active line group by default and lets the steward toggle
// between the full line group and the covered stretch when positioned tracks
// exist.
export function StewardMapOverlay({
  snapshot,
  network,
  assignedStation,
  checkedOutStation,
  onClose,
}: {
  snapshot: ScenarioSnapshot;
  network: MapNetwork;
  assignedStation?: string;
  checkedOutStation?: string;
  onClose: () => void;
}) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [zoomed, setZoomed] = useState(false);

  // Android's hardware back button closes the overlay instead of leaving the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose]);

  const model = deriveStewardMapModel(
    snapshot,
    network,
    assignedStation,
    checkedOutStation,
  );
  const position = (station: string) => model.mapData.positions[station];
  const fullArea = areaAroundStations(
    model.mapData.groupStations,
    FULL_LINE_MARGIN,
    position,
  );
  const stretchArea = areaAroundStations(
    model.stations,
    STRETCH_MARGIN,
    position,
  );
  const canZoom = stretchArea !== undefined;
  if (!canZoom && zoomed) setZoomed(false);
  const isZoomed = canZoom && zoomed;
  const viewBox = fitViewBoxToAspect(
    isZoomed ? stretchArea : fullArea,
    mapSize.width,
    mapSize.height,
  );
  const lineGroupLabel = LINE_GROUP_LABELS[snapshot.scenario.lineGroup];

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      testID="steward-map-overlay"
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Kort · {lineGroupLabel}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {snapshot.scenario.name}
          </Text>
        </View>
        {canZoom && (
          <Pressable
            testID="overlay-zoom-toggle"
            accessibilityRole="button"
            accessibilityLabel={isZoomed ? "Zoom ud" : "Zoom ind"}
            onPress={() => setZoomed((current) => !current)}
            style={[styles.actionButton, isZoomed && styles.actionButtonActive]}
          >
            <Text
              style={[styles.actionText, isZoomed && styles.actionTextActive]}
            >
              {isZoomed ? "Zoom ud" : "Zoom ind"}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Luk kort"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>Luk</Text>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M6 6l12 12M18 6L6 18"
              stroke={colors.text}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Pressable>
      </View>

      {model.mapData.missingRoutes && (
        <View style={styles.alertBanner}>
          <Text accessibilityRole="alert" style={styles.alertText}>
            En eller flere ruter kan ikke vises på kortet.
          </Text>
        </View>
      )}

      <View
        style={styles.mapContainer}
        testID="overlay-map-container"
        onLayout={(event) => setMapSize(event.nativeEvent.layout)}
      >
        <OverlayMap
          mapData={model.mapData}
          mapKey={model.mapKey}
          required={model.required}
          levels={model.levels}
          levelsKey={model.levelsKey}
          ownStation={model.ownStation}
          viewBox={viewBox}
        />
      </View>

      <MapLegend />
    </View>
  );
}

type OverlayMapProps = {
  mapData: StewardMapData;
  mapKey: string;
  required: StationRequirement[];
  levels: ReturnType<typeof stationCoverage>;
  levelsKey: string;
  ownStation: string | undefined;
  viewBox: string | undefined;
};

const OverlayMap = memo(
  function OverlayMap({
    mapData,
    required,
    levels,
    ownStation,
    viewBox,
  }: OverlayMapProps) {
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
        markedStations={required.map((row) => row.station)}
        requiredStaffing={Object.fromEntries(
          required.map((row) => [row.station, row.minimumStaffing]),
        )}
        stationCoverage={levels}
      />
    );
  },
  (a, b) =>
    a.mapKey === b.mapKey &&
    a.levelsKey === b.levelsKey &&
    a.ownStation === b.ownStation &&
    a.viewBox === b.viewBox,
);

function MapLegend() {
  return (
    <View style={styles.legend} testID="map-overlay-legend">
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle
              cx={12}
              cy={12}
              r={9}
              fill={colors.background}
              stroke={colors.text}
              strokeWidth={3}
            />
            <SvgText
              x={12}
              y={16}
              textAnchor="middle"
              fontSize={12}
              fontWeight="bold"
              fill={colors.text}
            >
              2
            </SvgText>
          </Svg>
          <Text style={styles.legendText}>Tal = krævede stewards</Text>
        </View>

        <View style={styles.legendItem}>
          <Svg width={22} height={22} viewBox="0 0 28 28">
            <Circle
              testID="legend-own-station-gap"
              cx={14}
              cy={14}
              r={9.5}
              fill="none"
              stroke={colors.background}
              strokeWidth={2}
            />
            <Circle
              testID="legend-own-station-ring"
              cx={14}
              cy={14}
              r={11.5}
              fill="none"
              stroke={colors.text}
              strokeWidth={2}
            />
            <Circle
              cx={14}
              cy={14}
              r={7}
              fill={colors.background}
              stroke={colors.text}
              strokeWidth={2.5}
            />
          </Svg>
          <Text style={styles.legendText}>Din station</Text>
        </View>

        <View style={styles.legendItem}>
          <Svg width={26} height={14} viewBox="0 0 26 14">
            <Line
              testID="legend-blocked-track"
              x1={1}
              y1={7}
              x2={25}
              y2={7}
              stroke={colors.blockedTrack}
              strokeWidth={4}
              strokeDasharray="6 4"
            />
          </Svg>
          <Text style={styles.legendText}>Spærret spor</Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            testID="legend-coverage-covered"
            style={[
              styles.coverageDot,
              { backgroundColor: coverageColors.covered.fill },
            ]}
          />
          <Text style={styles.legendText}>Bemandet</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            testID="legend-coverage-partial"
            style={[
              styles.coverageDot,
              { backgroundColor: coverageColors.partial.fill },
            ]}
          />
          <Text style={styles.legendText}>Delvist</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            testID="legend-coverage-gap"
            style={[
              styles.coverageDot,
              { backgroundColor: coverageColors.gap.fill },
            ]}
          />
          <Text style={styles.legendText}>Mangler</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  header: {
    alignItems: "center",
    borderBottomColor: steward.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.small * 2,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...text.header,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: steward.muted,
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.text,
    borderRadius: panelRadius,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.medium,
  },
  actionButtonActive: {
    backgroundColor: steward.black,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  actionTextActive: {
    color: colors.textInverse,
  },
  closeButton: {
    alignItems: "center",
    borderColor: colors.text,
    borderRadius: panelRadius,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.medium,
  },
  closeText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  alertBanner: {
    backgroundColor: steward.strip,
    borderBottomColor: steward.line,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.small * 2,
  },
  alertText: {
    color: steward.nobody,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
  },
  legend: {
    backgroundColor: steward.strip,
    borderTopColor: steward.line,
    borderTopWidth: 1,
    gap: spacing.small * 2,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.medium,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  coverageDot: {
    borderColor: colors.text,
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  legendText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
});
