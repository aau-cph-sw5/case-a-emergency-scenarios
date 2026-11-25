import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LINE_GROUP_LABELS } from "../../../shared/auth/line-groups";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { areaAroundStations } from "../../../shared/scenario/affected-stations";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";
import type { NetworkStatus } from "../network/useNetwork";
import { MapNotes, StewardMap } from "./StewardMap";
import { StewardMapLegend } from "./StewardMapLegend";
import type { StewardMapModel } from "./steward-map-data";

const FULL_LINE_MARGIN = 90;
const STRETCH_MARGIN = 80;

// Full-screen map overlay for the steward app (MET-A-031, #467).
// Shows the whole active line group by default and lets the steward toggle
// between the full line group and the covered stretch when positioned tracks
// exist.
export function StewardMapOverlay({
  snapshot,
  model,
  networkIsCached = false,
  networkStatus = "ready",
  onClose,
}: {
  snapshot: ScenarioSnapshot;
  model: StewardMapModel;
  networkIsCached?: boolean;
  networkStatus?: NetworkStatus;
  onClose: () => void;
}) {
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
  if (zoomed && !canZoom) setZoomed(false);

  const lineGroupLabel = LINE_GROUP_LABELS[snapshot.scenario.lineGroup];

  return (
    <View style={styles.overlay} testID="steward-map-overlay">
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
            accessibilityLabel={zoomed ? "Zoom ud" : "Zoom ind"}
            onPress={() => setZoomed((current) => !current)}
            style={[styles.actionButton, zoomed && styles.actionButtonActive]}
          >
            <Text
              style={[styles.actionText, zoomed && styles.actionTextActive]}
            >
              {zoomed ? "Zoom ud" : "Zoom ind"}
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

      <MapNotes
        networkIsCached={networkIsCached}
        networkIncomplete={networkStatus === "incomplete"}
        missingStretch={model.mapData.missingStretch}
        missingRoutes={model.mapData.missingRoutes}
        style={styles.notesBanner}
      />

      <View style={styles.mapContainer} testID="overlay-map-container">
        <StewardMap model={model} viewBox={zoomed ? stretchArea : fullArea} />
      </View>

      <StewardMapLegend />
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
    gap: spacing.medium,
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
    gap: spacing.small,
    minHeight: 44,
    paddingHorizontal: spacing.medium,
  },
  closeText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  notesBanner: {
    backgroundColor: steward.strip,
    borderBottomColor: steward.line,
    borderBottomWidth: 1,
    gap: spacing.small,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.small,
  },
  mapContainer: {
    flex: 1,
  },
});
