import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import {
  colors as theme,
  lineColors,
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
const lineColor = Object.fromEntries(
  network.map((line, index) => [line.name, lineColors[index]]),
);

// What the map shows for the selected scenario (#183). Every line has a button,
// but only the lines through its covered pieces start switched on, or the whole
// network when none of them is on the map. The stations its current version
// needs staff at are marked. The optional zoom fits the covered stretch and
// every marked station, including a marked station on another line.
export function mapView(scenario: Scenario | null) {
  const stretch =
    scenario === null ? [] : affectedStretchAsMapLine(scenario).connections;
  const covered = linesThrough(network, stretch);
  const markedStations = scenario === null ? [] : requiredStations(scenario);
  const requirements =
    scenario?.versions.find(
      (version) => version.version === scenario.currentVersion,
    )?.stationRequirements ?? [];
  return {
    initiallyHidden:
      covered.length > 0
        ? network
            .filter((line) => !covered.includes(line))
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
  lineGroup,
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
  // A different scenario starts zoomed out until the operator zooms in.
  const [zoomedInto, setZoomedInto] = useState<string | null>(null);
  const view = mapView(scenario);
  const groupLines = lineGroup
    ? network.filter((line) => lineGroup.split("/").includes(line.name))
    : network;
  const groupStations = new Set(
    groupLines.flatMap((line) => line.connections.flat()),
  );
  const groupViewBox = lineGroup
    ? areaAroundStations([...groupStations], 90)
    : undefined;
  const groupHasScenario = groupLines.some(
    (line) => !view.initiallyHidden.includes(line.name),
  );
  const canZoom =
    view.viewBox !== undefined && (!lineGroup || groupHasScenario);
  const zoomedIn = canZoom && zoomedInto === scenarioId;
  return (
    <View style={{ flex: 1 }}>
      {scenario !== null && (
        <Text
          style={[
            text.small,
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              zIndex: 2,
              backgroundColor: theme.background,
              padding: 4,
            },
          ]}
        >
          {scenario.name} · Tal på stationerne viser krævede stewards
        </Text>
      )}
      {canZoom && (
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 1,
            backgroundColor: theme.background,
            borderColor: theme.text,
            borderWidth: 1,
            borderRadius: radius,
            padding: 8,
            margin: 4,
          }}
          onPress={() => setZoomedInto(zoomedIn ? null : scenarioId)}
        >
          <Text style={text.body}>
            {zoomedIn ? "Vis hele kortet" : "Zoom ind"}
          </Text>
        </Pressable>
      )}
      {/* A new key once each scenario has loaded resets which lines are on,
          so the choices made for one scenario do not carry into the next. */}
      <MapRender
        key={`${scenario?.scenarioId ?? "none"}-${lineGroup ?? "all"}`}
        lines={groupLines}
        colors={lineColor}
        showLineButtons={!lineGroup}
        initiallyHidden={lineGroup ? [] : view.initiallyHidden}
        viewBox={zoomedIn ? view.viewBox : groupViewBox}
        markedStations={
          lineGroup
            ? view.markedStations.filter((station) =>
                groupStations.has(station),
              )
            : view.markedStations
        }
        requiredStaffing={view.requiredStaffing}
        highlightColor={theme.requiredStation}
        blockedTracks={scenario?.covers ?? []}
      />
    </View>
  );
}
