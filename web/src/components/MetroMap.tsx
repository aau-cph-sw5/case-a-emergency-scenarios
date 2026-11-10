import { useState } from "react";
import { createPortal } from "react-dom";
import { Pressable, Text, View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import {
  colors as theme,
  lineColors,
  palette,
  radius,
  text,
} from "../../../shared/Theme";
import { getLines, getStation } from "../../../mockData/data";
import {
  affectedStretchAsMapLine,
  areaAroundStations,
  linesThrough,
  requiredStations,
} from "../../../shared/scenario/affected-stations";
import type { Scenario } from "../../../shared/types/v1/scenario";
import { useScenario } from "../data/useScenario";

// The whole metro network, each line in its own colour (M1 to M4). The colour
// belongs to the line, so M2 keeps its colour when it is shown alone.
const network = getLines().map((line) => ({ ...line, tracks: [1, 2] }));
const lineGroups = [
  ["M1", "M2"],
  ["M3", "M4"],
] as const;
const networkColors = Object.fromEntries(
  network.map((line, index) => [line.name, lineColors[index]]),
);

function destinationLines(scenario: Scenario | null) {
  const version = scenario?.versions.find(
    (item) => item.version === scenario.currentVersion,
  );
  if (!version || version.operatingPlan.patterns.length === 0) return null;

  const destinations = new Map<
    string,
    { tracks: Set<number>; connections: [string, string][] }
  >();

  for (const pattern of version.operatingPlan.patterns) {
    let destination = destinations.get(pattern.did);
    if (!destination) {
      destination = { tracks: new Set(), connections: [] };
      destinations.set(pattern.did, destination);
    }

    const tracks = pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber];
    tracks.forEach((track) => destination.tracks.add(track));

    const route = pattern.route
      .filter((stop) => typeof stop.sequence === "number")
      .sort((a, b) => Number(a.sequence) - Number(b.sequence));
    for (let index = 1; index < route.length; index++) {
      const stationA = route[index - 1].station;
      const stationB = route[index].station;
      if (typeof stationA !== "string" || typeof stationB !== "string") {
        continue;
      }
      if (getStation(stationA) && getStation(stationB)) {
        destination.connections.push([stationA, stationB]);
      }
    }
  }

  return [...destinations]
    .sort(([didA], [didB]) =>
      didA.localeCompare(didB, undefined, { numeric: true }),
    )
    .map(([name, line], index) => ({
      name,
      tracks: [...line.tracks],
      connections: line.connections,
      color: lineColors[index % lineColors.length],
    }));
}

// What the map shows for the selected scenario (#183). Every line has a button,
// but only the lines through its covered pieces start switched on, or the whole
// network when none of them is on the map. The stations its current version
// needs staff at are marked. The view zooms to the covered stretch and every
// marked station, so a marked station on another line stays in the frame.
export function mapView(
  scenario: Scenario | null,
  destinations: ReturnType<typeof destinationLines> = null,
) {
  const stretch =
    scenario === null ? [] : affectedStretchAsMapLine(scenario).connections;
  const displayedLines = destinations ?? network;
  const covered = linesThrough(displayedLines, stretch);
  const enabledLines: readonly string[] = lineGroups
    .filter((group) =>
      group.some((name) => covered.some((line) => line.name === name)),
    )
    .flat();
  const markedStations = scenario === null ? [] : requiredStations(scenario);
  const requirements =
    scenario?.versions.find(
      (version) => version.version === scenario.currentVersion,
    )?.stationRequirements ?? [];
  return {
    initiallyHidden:
      destinations !== null
        ? []
        : covered.length > 0
          ? network
              .filter((line) => !enabledLines.includes(line.name))
              .map((line) => line.name)
          : [],
    markedStations,
    requiredStaffing: Object.fromEntries(
      requirements.map(({ station, minimumStaffing }) => [
        station,
        minimumStaffing,
      ]),
    ),
    // Undefined for the whole network, which keeps the map's own view.
    viewBox: (destinations !== null ? stretch.length > 0 : covered.length > 0)
      ? areaAroundStations(
          [
            ...stretch.flat(),
            ...(destinations ?? []).flatMap((line) => line.connections.flat()),
            ...markedStations,
          ],
          160,
        )
      : undefined,
  };
}

export function MetroMap({
  scenarioId,
  scenario: previewScenario,
  lineControlsTarget,
}: {
  scenarioId: string | null;
  scenario?: Scenario | null;
  lineControlsTarget?: HTMLElement | null;
}) {
  // While the scenario loads, or if it cannot be loaded, scenario is null and
  // the whole network is shown. The preview next to the map shows the error.
  // The requirements panel can supply its result, including null while loading
  // or retrying, so both previews always show the same saved version.
  const { scenario: loadedScenario } = useScenario(
    previewScenario === undefined ? scenarioId : null,
  );
  const scenario =
    previewScenario === undefined ? loadedScenario : previewScenario;
  const destinations = destinationLines(scenario);
  const displayedLines = destinations ?? network;
  const displayedColors = destinations
    ? Object.fromEntries(destinations.map(({ name, color }) => [name, color]))
    : networkColors;
  // Holds the scenario zoomed out from, so the next scenario zooms in again.
  const [zoomedOutOf, setZoomedOutOf] = useState<string | null>(null);
  const view = mapView(scenario, destinations);
  const canZoom = view.viewBox !== undefined;
  const zoomedOut = canZoom && zoomedOutOf === scenarioId;
  return (
    <View style={{ flex: 1 }}>
      {scenario !== null && (
        <Text
          style={[
            text.small,
            {
              backgroundColor: theme.background,
              padding: 12,
              paddingRight: canZoom ? 130 : 12,
            },
          ]}
        >
          {scenario.name} · Tal på stationerne viser krævede stewards
        </Text>
      )}
      {canZoom && (
        <Pressable
          testID="map-zoom-toggle"
          accessibilityRole="button"
          accessibilityLabel={zoomedOut ? "Zoom ind" : "Zoom ud"}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            backgroundColor: palette.metroLineFour,
            borderColor: theme.text,
            borderWidth: 1,
            borderRadius: Math.max(radius, 8),
            padding: 8,
            margin: 4,
          }}
          onPress={() => setZoomedOutOf(zoomedOut ? null : scenarioId)}
        >
          <Text
            style={[text.body, { color: theme.textInverse, fontWeight: "700" }]}
          >
            {zoomedOut ? "Zoom ind" : "Zoom ud"}
          </Text>
        </Pressable>
      )}
      {/* A new key once each scenario has loaded resets which lines are on,
          so the choices made for one scenario do not carry into the next. */}
      <div className="operator-map-renderer">
        <MapRender
          key={scenario?.scenarioId ?? "none"}
          lines={displayedLines}
          colors={displayedColors}
          lineGroups={destinations ? undefined : lineGroups}
          initiallyHidden={view.initiallyHidden}
          renderLineButtons={
            lineControlsTarget
              ? (buttons) => createPortal(buttons, lineControlsTarget)
              : undefined
          }
          viewBox={zoomedOut ? undefined : view.viewBox}
          markedStations={view.markedStations}
          requiredStaffing={view.requiredStaffing}
          highlightColor={theme.requiredStation}
          blockedTracks={scenario?.covers ?? []}
        />
      </div>
    </View>
  );
}
