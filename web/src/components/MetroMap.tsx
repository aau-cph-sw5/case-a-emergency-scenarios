import { use, useState } from "react";
import { createPortal } from "react-dom";
import { Pressable, Text, View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import {
  colors as theme,
  DIDLineColors,
  palette,
  radius,
  text,
} from "../../../shared/Theme";
import { LINE_GROUP_LINES } from "../../../shared/auth/line-groups";
import {
  affectedStretchAsMapLine,
  areaAroundStations,
  linesThrough,
  requiredStations,
} from "../../../shared/scenario/affected-stations";
import {
  CLOSED_LINE,
  routeColor,
  scenarioLines,
} from "../../../shared/scenario/map-lines";
import {
  stationCoverage,
  type ActiveDeployments,
} from "../../../shared/components/stationState";
import type { Scenario } from "../../../shared/types/v1/scenario";
import { useScenario } from "../data/useScenario";
import { useNetwork } from "../data/useNetwork";
import { ColourSlotContext } from "./colour-slot";
import type { MapNetwork } from "../../../shared/network/network";

// What a scenario's routes are coloured by: the Metro line each runs on, or
// one colour per destination ID, which tells two routes on one line apart.
type ColourBy = "line" | "did";
const COLOUR_MODES: { id: ColourBy; label: string }[] = [
  { id: "line", label: "Metrolinje" },
  { id: "did", label: "Destination ID" },
];

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
  const [colourBy, setColourBy] = useState<ColourBy>("line");
  const colourSlot = use(ColourSlotContext);
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
  const runningLines =
    scenarioId === null ? groupNetwork : (scenarioLineResult?.lines ?? []);
  const closedLine = scenarioLineResult?.closedLine ?? null;
  const groupLines = closedLine ? [...runningLines, closedLine] : runningLines;
  const missingScenarioRoutes = scenarioLineResult?.missingRoutes ?? false;
  const routeColors =
    scenarioId === null
      ? Object.fromEntries(
          groupNetwork.map((line) => [
            line.name,
            line.color ?? palette.networkGrey,
          ]),
        )
      : {
          ...Object.fromEntries(
            runningLines.map((route, index) => [
              route.name,
              colourBy === "did"
                ? (route.color ?? DIDLineColors[index % DIDLineColors.length])
                : routeColor(route, groupNetwork, theme.text),
            ]),
          ),
          [CLOSED_LINE]: theme.blockedTrack,
        };
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

  // Same segmented switch as M1 / M2 in the header and the mode tabs in the
  // scenario picker (.operator-line-switcher), so the three switches look and
  // behave alike: the pressed option is the white one. It is drawn in the
  // legend row above the map when the dashboard offers that slot.
  const colourSwitch = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={text.small}>Farver efter:</Text>
      <div
        className="operator-line-switcher"
        role="group"
        aria-label="Farver efter"
      >
        {COLOUR_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={colourBy === id}
            onClick={() => setColourBy(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </View>
  );

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

      {scenarioId !== null && runningLines.length > 0 && (
        <View
          accessibilityLabel="Destination IDs"
          style={{ marginLeft: 8, flexDirection: "column", gap: 6 }}
        >
          {colourSlot ? createPortal(colourSwitch, colourSlot) : colourSwitch}
          <Text style={text.small}>Destination IDs:</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {runningLines.map((line) => (
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
