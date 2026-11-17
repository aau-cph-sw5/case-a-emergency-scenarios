import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import {
  colors as theme,
  DIDLineColors,
  lineColors,
  palette,
  radius,
  text,
} from "../../../shared/Theme";
import {
  affectedStretchAsMapLine,
  areaAroundStations,
  linesThrough,
  requiredStations,
} from "../../../shared/scenario/affected-stations";
import { routeConnections } from "../../../shared/scenario/route-connections";
import {
  stationCoverage,
  type ActiveDeployments,
} from "../../../shared/components/stationState";
import type { Scenario } from "../../../shared/types/v1/scenario";
import { useScenario } from "../data/useScenario";
import { useNetwork } from "../data/useNetwork";
import { resolveStops, type MapNetwork } from "../../../shared/network/network";

const lineGroups = [
  ["M1", "M2"],
  ["M3", "M4"],
] as const;
const lineColor = Object.fromEntries(
  ["M1", "M2", "M3", "M4"].map((line, index) => [line, lineColors[index]]),
);

function scenarioLines(
  scenario: Scenario,
  groupLines: MapNetwork["lines"],
  segments: MapNetwork["segments"],
) {
  const expectedLines =
    scenario.lineGroup === "M1_M2" ? ["M1", "M2"] : ["M3", "M4"];
  if (!groupLines.some((line) => expectedLines.includes(line.name))) {
    return { lines: [], missingRoutes: false };
  }

  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );

  let missingRoutes = false;
  const routes =
    current?.operatingPlan.patterns
      .filter((pattern) => pattern.did.trim() !== "")
      .sort((a, b) => a.did.localeCompare(b.did, undefined, { numeric: true }))
      .map((pattern) => {
        const tracks =
          pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber];
        const stops = routeConnections(pattern.route);
        const stopList = stops.length
          ? [stops[0][0], ...stops.map(([, station]) => station)]
          : [];
        if (stopList.length < 2 || stops.length !== pattern.route.length - 1) {
          missingRoutes = true;
          return { name: pattern.did, tracks, connections: [] };
        }
        const result = resolveStops(stopList, groupLines, segments, tracks);
        if (result.incomplete) missingRoutes = true;
        return { name: pattern.did, tracks, connections: result.connections };
      }) ?? [];
  return { lines: routes, missingRoutes: missingRoutes || routes.length === 0 };
}

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
  lineGroup?: "M1/M2" | "M3/M4";
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
  const { network: mapNetwork, error: networkError, retry } = useNetwork(token);
  if (networkError)
    return (
      <View>
        <Text role="alert">{networkError}</Text>
        <Pressable onPress={retry}>
          <Text>Prøv igen</Text>
        </Pressable>
      </View>
    );
  if (!mapNetwork) return <Text>Indlæser metronetværk…</Text>;
  const network = mapNetwork.lines;
  const position = (station: string) => mapNetwork.positions[station];
  const view = mapView(scenario, deployments, network, position);
  const groupNetwork = network.filter((line) =>
    lineGroup.split("/").includes(line.name),
  );
  const scenarioLineResult =
    scenarioId === null || scenario === null
      ? null
      : scenarioLines(scenario, groupNetwork, mapNetwork.segments);
  const groupLines =
    scenarioId === null
      ? groupNetwork
      : scenario === null
        ? []
        : (scenarioLineResult?.lines ?? []);
  const missingScenarioRoutes = scenarioLineResult?.missingRoutes ?? false;
  const routeColors =
    scenarioId === null
      ? lineColor
      : Object.fromEntries(
          groupLines.map((line, index) => [
            line.name,
            DIDLineColors[index % DIDLineColors.length],
          ]),
        );
  const groupStations = new Set([
    ...groupNetwork.flatMap((line) => line.connections.flat()),
    ...groupLines.flatMap((line) => line.connections.flat()),
  ]);
  const groupViewBox = areaAroundStations([...groupStations], 90, position);
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
          {deployments !== null
            ? " · Grøn: bemandet, gul: delvist, rød: mangler"
            : ""}
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
          positions={mapNetwork.positions}
          ringStations={mapNetwork.ringStations}
          availableSegments={mapNetwork.segments}
          showLineButtons={false}
          viewBox={zoomedIn ? view.viewBox : groupViewBox}
          markedStations={view.markedStations.filter((station) =>
            groupStations.has(station),
          )}
          requiredStaffing={view.requiredStaffing}
          stationCoverage={view.stationCoverage}
          highlightColor={theme.requiredStation}
          blockedTracks={scenario?.covers ?? []}
        />
      </div>

      {mapNetwork.incomplete && (
        <Text role="alert" style={text.small}>
          Metronetværket er ufuldstændigt.
        </Text>
      )}
      {missingScenarioRoutes && (
        <Text role="alert" style={text.small}>
          En eller flere ruter kan ikke vises på kortet.
        </Text>
      )}

      {scenarioId !== null && groupLines.length > 0 && (
        <View
          accessibilityLabel="Destination IDs"
          style={{ marginLeft: 8, flexDirection: "column", gap: 6 }}
        >
          <Text style={text.small}>Destination IDs:</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {groupLines.map((line) => (
              <View
                key={line.name}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 20,
                    height: 5,
                    borderRadius: 2,
                    backgroundColor: routeColors[line.name],
                  }}
                />
                <Text style={text.small}>{line.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
