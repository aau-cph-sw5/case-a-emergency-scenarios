import { FlatList, Text, View } from "react-native";
import { box, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import { countManned, type ActiveDeployments } from "./stationState";
import StationRow from "./stationRow";
import metroLineM1 from "../../fixtures/v1/metro-lines/M1.json";
import metroLineM2 from "../../fixtures/v1/metro-lines/M2.json";

const STATION_ORDER = [metroLineM1, metroLineM2].flatMap(({ stops }) =>
  [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map(({ station }) => station),
);
const STATION_RANK = new Map(
  STATION_ORDER.map((station, index) => [station, index]),
);

type Props = {
  scenario: Scenario;
  activeDeployments: ActiveDeployments;
};

export default function ScenarioStationList({
  scenario,
  activeDeployments,
}: Props) {
  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion,
  );

  const stations = [...(version?.stationRequirements ?? [])].sort(
    (a, b) =>
      (STATION_RANK.get(a.station) ?? Number.MAX_SAFE_INTEGER) -
      (STATION_RANK.get(b.station) ?? Number.MAX_SAFE_INTEGER),
  );

  const coveredCount = countManned(activeDeployments, stations);

  return (
    <FlatList // we dont currently have a station order.
      data={stations}
      keyExtractor={(item) => item.station}
      ListHeaderComponent={
        <View style={{ margin: 8 }}>
          <Text style={text.title}>
            {coveredCount}/{stations.length} stations covered
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <StationRow requirement={item} deployments={activeDeployments} />
      )}
    />
  );
}
