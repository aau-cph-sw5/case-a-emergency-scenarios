import { StyleSheet, Text, View } from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { box, colors, surface, text, lineColors } from "../../../shared/Theme";
import MapRender from "../../../shared/MapRenderer";



export function ScenarioOverview({snapshot}: {snapshot: ScenarioSnapshot}) {
    const {scenario } = snapshot;

    const mapLines = [
        {
            name: scenario.name,
            tracks: [1,2],
            connections: (scenario.covers ?? []).map(
                (segment) => [segment.stationA, segment.stationB] as [string, string],
            ),
        },
    ];
    const mapColors = { [ scenario.name]: lineColors[0]};
    

    return (
        <View>
        <View style={styles.mapBox}>
            <MapRender lines={mapLines} colors={mapColors} />
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mapBox: {
        ...surface,
        ...box,
        height: 250,
        marginBottom: 8,
    },
});