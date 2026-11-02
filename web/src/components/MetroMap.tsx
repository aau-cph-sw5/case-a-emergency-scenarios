import { View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import { lineColors } from "../../../shared/Theme";
import { getLines } from "../../../mockData/data";

// The whole metro network, each line in its own colour (M1 to M4), with the
// line toggle buttons. Uses the same MapRenderer as the steward app (#183).
const lines = getLines().map((line) => ({ ...line, tracks: [1, 2] }));
const colors = Object.fromEntries(
  lines.map((line, index) => [line.name, lineColors[index]]),
);

export function MetroMap() {
  return (
    <View style={{ flex: 1 }}>
      <MapRender lines={lines} colors={colors} />
    </View>
  );
}
