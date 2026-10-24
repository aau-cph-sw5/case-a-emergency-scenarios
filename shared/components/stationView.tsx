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

type Props =
  | {
      scenario: Scenario;
      mode: "needed-only";
    }
  | {
      scenario: Scenario;
      mode?: "live-coverage";
      activeDeployments: ActiveDeployments;
    };

export default function ScenarioStationList(props: Props) {
  const { scenario } = props;

  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion,
  );

  const stations = [...(version?.stationRequirements ?? [])].sort(
    (a, b) =>
      (STATION_RANK.get(a.station) ?? Number.MAX_SAFE_INTEGER) -
      (STATION_RANK.get(b.station) ?? Number.MAX_SAFE_INTEGER),
  );

  //Sums the total required stewards in scenario
  const totalStewards = stations.reduce(
    (total, station) => total + station.minimumStaffing,
    0,
  );

  //Only calculates live coverage when deployment information is available
  const coveredCount =
    props.mode === "needed-only"
      ? null
      : countManned(props.activeDeployments, stations);

  return (
    <FlatList // we dont currently have a station order.
      data={stations}
      keyExtractor={(item) => item.station}
      ListHeaderComponent={
        <View style={[box, { margin: 8 }]}>
          {props.mode === "needed-only" ? (
            <>
              <Text style={text.title}>Required coverage</Text>

              <Text style={text.body}>
                {stations.length} stations · {totalStewards} stewards needed
              </Text>
            </>
          ) : (
            <Text style={text.title}>
              {coveredCount}/{stations.length} stations covered
            </Text>
          )}
        </View>
      }
      renderItem={({ item }) =>
        props.mode === "needed-only" ? (
          <StationRow requirement={item} mode="needed-only" />
        ) : (
          <StationRow
            requirement={item}
            deployments={props.activeDeployments}
          />
        )
      }
    />
  );
}
