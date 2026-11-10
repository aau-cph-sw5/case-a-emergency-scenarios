import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import {
  colors as theme,
  lineColors,
  palette,
  radius,
  text,
} from "../../../shared/Theme";
import { getLines } from "../../../mockData/data";
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
const lineColor = Object.fromEntries(
  network.map((line, index) => [line.name, lineColors[index]]),
);

// Scenario data determines staffing markers and the optional close-up view.
// The operator chooses the visible line group separately in the header.
export function mapView(scenario: Scenario | null) {
  const stretch =
    scenario === null ? [] : affectedStretchAsMapLine(scenario).connections;
  const covered = linesThrough(network, stretch);
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
      covered.length > 0
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
    viewBox:
      covered.length > 0
        ? areaAroundStations([...stretch.flat(), ...markedStations], 160)
        : undefined,
  };
}

export function MetroMap({
  scenarioId,
  scenario: previewScenario,
  lineGroup = "M1/M2",
}: {
  scenarioId: string | null;
  scenario?: Scenario | null;
  lineGroup?: "M1/M2" | "M3/M4";
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
  // Each scenario starts with its whole line group in view.
  const [zoomedInto, setZoomedInto] = useState<string | null>(null);
  const view = mapView(scenario);
  const groupLines = network.filter((line) =>
    lineGroup.split("/").includes(line.name),
  );
  const groupStations = new Set(
    groupLines.flatMap((line) => line.connections.flat()),
  );
  const groupViewBox = areaAroundStations([...groupStations], 90);
  const groupHasScenario = groupLines.some(
    (line) => !view.initiallyHidden.includes(line.name),
  );
  const canZoom = view.viewBox !== undefined && groupHasScenario;
  const zoomKey = `${scenarioId}-${lineGroup}`;
  const zoomedIn = canZoom && zoomedInto === zoomKey;
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
          accessibilityLabel={zoomedIn ? "Zoom ud" : "Zoom ind"}
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
          onPress={() => setZoomedInto(zoomedIn ? null : zoomKey)}
        >
          <Text
            style={[text.body, { color: theme.textInverse, fontWeight: "700" }]}
          >
            {zoomedIn ? "Zoom ud" : "Zoom ind"}
          </Text>
        </Pressable>
      )}
      {/* Reset map interaction when the scenario or line group changes. */}
      <div className="operator-map-renderer">
        <MapRender
          key={`${scenario?.scenarioId ?? "none"}-${lineGroup}`}
          lines={groupLines}
          colors={lineColor}
          showLineButtons={false}
          viewBox={zoomedIn ? view.viewBox : groupViewBox}
          markedStations={view.markedStations.filter((station) =>
            groupStations.has(station),
          )}
          requiredStaffing={view.requiredStaffing}
          highlightColor={theme.requiredStation}
          blockedTracks={scenario?.covers ?? []}
        />
      </div>
    </View>
  );
}
