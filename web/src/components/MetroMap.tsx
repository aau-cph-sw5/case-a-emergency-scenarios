import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import { colors as theme } from "../../../shared/Theme";
import { LINE_GROUP_LINES } from "../../../shared/auth/line-groups";
import {
  affectedStretchAsMapLine,
  areaAroundStations,
  linesThrough,
  requiredStations,
} from "../../../shared/scenario/affected-stations";
import type { LineGroupLabel } from "../../../shared/auth/line-groups";
import {
  stationCoverage,
  type ActiveDeployments,
} from "../../../shared/components/stationState";
import type { Scenario } from "../../../shared/types/v1/scenario";
import type { MapNetwork } from "../../../shared/network/network";
import { useScenario } from "../data/useScenario";
import { useNetwork } from "../data/useNetwork";
import {
  buildMapLines,
  closedStretchLine,
  legendEntriesFor,
  routeColorMap,
  type ColourBy,
} from "./metroMapModel";
import { Legend, MapAlerts, ScenarioBanner, ZoomToggle } from "./MetroMapParts";
import { ZoomFrame } from "./ZoomFrame";

export { closedStretchLine };

// Design rationale: MetroMap only decides what to show. The lines and colours
// come from metroMapModel.ts (pure), the banner, zoom button, alerts and
// legend from MetroMapParts.tsx, and the map itself from shared/MapRenderer.

// Scenario data determines staffing markers and the optional close-up view.
// The operator chooses the visible line group separately in the header.
export function mapView(
  scenario: Scenario | null,
  deployments: ActiveDeployments | null,
  network: MapNetwork["lines"],
  position?: (station: string) => [number, number] | undefined,
) {
  const stretch =
    scenario === null
      ? []
      : affectedStretchAsMapLine(scenario, position).connections;
  const covered = linesThrough(network, stretch);
  const enabledLines: readonly string[] = Object.values(LINE_GROUP_LINES)
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
    // Only for the active scenario: green, yellow or red per station, the
    // same as its coverage card (MET-A-011, #310).
    stationCoverage:
      deployments === null ? {} : stationCoverage(requirements, deployments),
    // Undefined without an affected stretch, which keeps the map's own view.
    viewBox:
      covered.length > 0
        ? areaAroundStations(stretch.flat(), 160, position)
        : undefined,
  };
}

type MapProps = {
  scenarioId: string | null;
  scenario: Scenario | null;
  lineGroup: LineGroupLabel;
  deployments: ActiveDeployments | null;
};

function MapCanvas({
  scenario,
  lineGroup,
  mapNetwork,
  view,
  lines,
  routeColors,
  groupStations,
  viewBox,
}: {
  scenario: Scenario | null;
  lineGroup: string;
  mapNetwork: MapNetwork;
  view: ReturnType<typeof mapView>;
  lines: ReturnType<typeof buildMapLines>;
  routeColors: Record<string, string>;
  groupStations: Set<string>;
  viewBox: string | undefined;
}) {
  return (
    <ZoomFrame viewBox={viewBox}>
      {(shownViewBox) => (
        <MapRender
          // Reset map interaction when the scenario or line group changes.
          key={`${scenario?.scenarioId ?? "none"}-${lineGroup}`}
          lines={lines.groupLines}
          colors={routeColors}
          positions={mapNetwork.positions}
          ringStations={mapNetwork.ringStations}
          availableSegments={mapNetwork.segments}
          showLineButtons={false}
          viewBox={shownViewBox}
          markedStations={view.markedStations.filter((station) =>
            groupStations.has(station),
          )}
          requiredStaffing={view.requiredStaffing}
          mutedStations={lines.mutedStations}
          stationCoverage={view.stationCoverage}
          highlightColor={theme.requiredStation}
          blockedTracks={scenario?.covers ?? []}
        />
      )}
    </ZoomFrame>
  );
}

function MapBody({
  mapNetwork,
  scenarioId,
  scenario,
  lineGroup,
  deployments,
  colourBy,
  onColourBy,
  zoomedInto,
  onZoomedInto,
}: MapProps & {
  mapNetwork: MapNetwork;
  colourBy: ColourBy;
  onColourBy: (mode: ColourBy) => void;
  zoomedInto: string | null;
  onZoomedInto: (key: string | null) => void;
}) {
  const position = (station: string) => mapNetwork.positions[station];
  const view = mapView(scenario, deployments, mapNetwork.lines, position);
  const lines = buildMapLines(scenarioId, scenario, lineGroup, mapNetwork);
  const { groupNetwork, running, groupLines } = lines;
  const routeColors = routeColorMap(
    scenarioId,
    groupNetwork,
    running,
    colourBy,
  );

  const groupStations = new Set([
    ...groupNetwork.flatMap((line) => line.connections.flat()),
    ...groupLines.flatMap((line) => line.connections.flat()),
  ]);
  const groupViewBox = areaAroundStations([...groupStations], 90, position);
  const groupHasScenario = lines.drawn.some(
    (line) => !view.initiallyHidden.includes(line.name),
  );
  const canZoom = view.viewBox !== undefined && groupHasScenario;
  const zoomKey = `${scenarioId}-${lineGroup}`;
  const zoomedIn = canZoom && zoomedInto === zoomKey;

  return (
    <View style={{ flex: 1 }}>
      {scenario !== null && (
        <ScenarioBanner
          scenario={scenario}
          deployments={deployments}
          canZoom={canZoom}
        />
      )}
      {canZoom && (
        <ZoomToggle
          zoomedIn={zoomedIn}
          onToggle={() => onZoomedInto(zoomedIn ? null : zoomKey)}
        />
      )}

      <MapCanvas
        scenario={scenario}
        lineGroup={lineGroup}
        mapNetwork={mapNetwork}
        view={view}
        lines={lines}
        routeColors={routeColors}
        groupStations={groupStations}
        viewBox={(zoomedIn ? view.viewBox : undefined) ?? groupViewBox}
      />

      <MapAlerts
        incomplete={Boolean(mapNetwork.incomplete)}
        missingRoutes={lines.missingRoutes}
      />
      {scenarioId !== null && running.length > 0 && (
        <Legend
          colourBy={colourBy}
          onColourBy={onColourBy}
          entries={legendEntriesFor(
            running,
            groupNetwork,
            routeColors,
            colourBy,
          )}
        />
      )}
    </View>
  );
}

export function MetroMap({
  token,
  scenarioId,
  scenario: previewScenario,
  lineGroup = "M1/M2",
  deployments = null,
}: {
  token: string;
  scenarioId: string | null;
  scenario?: Scenario | null;
  lineGroup?: LineGroupLabel;
  deployments?: ActiveDeployments | null;
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
  const [colourBy, setColourBy] = useState<ColourBy>("line");
  const { network: mapNetwork, error: networkError, retry } = useNetwork(token);
  if (networkError)
    return (
      <View>
        <Text role="alert">{networkError}</Text>
        <Pressable testID="map-retry" onPress={retry}>
          <Text>Prøv igen</Text>
        </Pressable>
      </View>
    );
  if (!mapNetwork) return <Text>Indlæser metronetværk…</Text>;
  return (
    <MapBody
      mapNetwork={mapNetwork}
      scenarioId={scenarioId}
      scenario={scenario}
      lineGroup={lineGroup}
      deployments={deployments}
      colourBy={colourBy}
      onColourBy={setColourBy}
      zoomedInto={zoomedInto}
      onZoomedInto={setZoomedInto}
    />
  );
}
