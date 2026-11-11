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
  areaAroundStations,
  linesThrough,
  requiredStations,
} from "../../../shared/scenario/affected-stations";
import type { Scenario, TrackSegment } from "../../../shared/types/v1/scenario";
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

function scenarioSegments(scenario: Scenario): TrackSegment[] {
  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );
  const routes =
    current?.operatingPlan.patterns.flatMap((pattern) => {
      const segments: TrackSegment[] = [];
      for (let index = 1; index < pattern.route.length; index += 1) {
        const stationA = pattern.route[index - 1].station;
        const stationB = pattern.route[index].station;
        if (typeof stationA === "string" && typeof stationB === "string") {
          segments.push({
            trackNumber: pattern.trackNumber,
            stationA,
            stationB,
          });
        }
      }
      return segments;
    }) ?? [];
  const segments = routes.length > 0 ? routes : (scenario.covers ?? []);
  const unique = new Map<string, TrackSegment>();
  for (const segment of segments) {
    const [first, second] = [segment.stationA, segment.stationB].sort();
    unique.set(`${first}-${second}`, segment);
  }
  return [...unique.values()];
}

function scenarioLines(scenario: Scenario, groupLines: typeof network) {
  const expectedLines =
    scenario.lineGroup === "M1_M2" ? ["M1", "M2"] : ["M3", "M4"];
  if (!groupLines.some((line) => expectedLines.includes(line.name))) {
    return [];
  }
  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );
  const routes =
    current?.operatingPlan.patterns
      .filter((pattern) => pattern.did.trim() !== "")
      .sort((a, b) => a.did.localeCompare(b.did, undefined, { numeric: true }))
      .map((pattern) => {
        const stops = pattern.route
          .slice()
          .sort(
            (a, b) =>
              (typeof a.sequence === "number" ? a.sequence : 0) -
              (typeof b.sequence === "number" ? b.sequence : 0),
          );
        return {
          name: pattern.did,
          tracks:
            pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber],
          connections: stops
            .slice(1)
            .map(
              (stop, index) =>
                [stops[index].station, stop.station] as [string, string],
            )
            .filter(
              ([stationA, stationB]) =>
                typeof stationA === "string" && typeof stationB === "string",
            ),
        };
      }) ?? [];
  if (routes.length > 0) return routes;
  const segments = scenarioSegments(scenario);
  return segments.length === 0
    ? []
    : [
        {
          name: groupLines[0].name,
          tracks: [1, 2],
          connections: segments.map(
            ({ stationA, stationB }) => [stationA, stationB] as [string, string],
          ),
        },
      ];
}

// Scenario routes determine the drawn tracks. The operator chooses the line
// group separately in the header.
export function mapView(scenario: Scenario | null) {
  const segments = scenario === null ? [] : scenarioSegments(scenario);
  const stretch = segments.map(
    ({ stationA, stationB }) => [stationA, stationB] as [string, string],
  );
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
    // Undefined without a scenario route, which keeps the map's own view.
    viewBox:
      covered.length > 0
        ? areaAroundStations(
            [
              ...segments.flatMap(({ stationA, stationB }) => [
                stationA,
                stationB,
              ]),
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
  lineGroup = "M1/M2",
}: {
  scenarioId: string | null;
  scenario?: Scenario | null;
  lineGroup?: "M1/M2" | "M3/M4";
}) {
  // While a selected scenario loads, or if it cannot be loaded, no map is
  // drawn. The preview next to the map shows the error.
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
  const groupNetwork = network.filter((line) =>
    lineGroup.split("/").includes(line.name),
  );
  const groupLines =
    scenarioId === null
      ? groupNetwork
      : scenario === null
        ? []
        : scenarioLines(scenario, groupNetwork);
  const routeColors =
    scenarioId === null
      ? lineColor
      : Object.fromEntries(
          groupLines.map((line, index) => [
            line.name,
            lineColors[index % lineColors.length],
          ]),
        );
  const groupStations = new Set([
    ...groupNetwork.flatMap((line) => line.connections.flat()),
    ...groupLines.flatMap((line) => line.connections.flat()),
  ]);
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
          colors={routeColors}
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
      {scenarioId !== null && groupLines.length > 0 && (
        <div
          className="map-legend"
          aria-label="Destination IDs"
          style={{ marginLeft: 8 }}
        >
          {groupLines.map((line) => (
            <span key={line.name}>
              <i
                style={{
                  width: 20,
                  height: 5,
                  borderRadius: 2,
                  background: routeColors[line.name],
                }}
              />
              {line.name}
            </span>
          ))}
        </div>
      )}
    </View>
  );
}
