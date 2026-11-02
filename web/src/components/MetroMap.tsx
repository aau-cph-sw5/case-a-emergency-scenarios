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
// needs staff at are marked. The view zooms to the covered stretch and every
// marked station, so a marked station on another line stays in the frame.
export function mapView(scenario: Scenario | null) {
  const stretch =
    scenario === null ? [] : affectedStretchAsMapLine(scenario).connections;
  const covered = linesThrough(network, stretch);
  const markedStations = scenario === null ? [] : requiredStations(scenario);
  return {
    initiallyHidden:
      covered.length > 0
        ? network
            .filter((line) => !covered.includes(line))
            .map((line) => line.name)
        : [],
    markedStations,
    // Undefined for the whole network, which keeps the map's own view.
    viewBox:
      covered.length > 0
        ? areaAroundStations([...stretch.flat(), ...markedStations])
        : undefined,
  };
}

export function MetroMap({ scenarioId }: { scenarioId: string | null }) {
  // While the scenario loads, or if it cannot be loaded, scenario is null and
  // the whole network is shown. The preview next to the map shows the error.
  const { scenario } = useScenario(scenarioId);
  // Holds the scenario zoomed out from, so the next scenario zooms in again.
  const [zoomedOutOf, setZoomedOutOf] = useState<string | null>(null);
  const view = mapView(scenario);
  const canZoom = view.viewBox !== undefined;
  const zoomedOut = canZoom && zoomedOutOf === scenarioId;
  return (
    <View style={{ flex: 1 }}>
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
          onPress={() => setZoomedOutOf(zoomedOut ? null : scenarioId)}
        >
          <Text style={text.body}>
            {zoomedOut ? "Zoom ind" : "Vis hele kortet"}
          </Text>
        </Pressable>
      )}
      {/* A new key once each scenario has loaded resets which lines are on,
          so the choices made for one scenario do not carry into the next. */}
      <MapRender
        key={scenario?.scenarioId ?? "none"}
        lines={network}
        colors={lineColor}
        initiallyHidden={view.initiallyHidden}
        viewBox={zoomedOut ? undefined : view.viewBox}
        markedStations={view.markedStations}
        highlightColor={theme.requiredStation}
        blockedTracks={scenario?.covers ?? []}
      />
    </View>
  );
}
