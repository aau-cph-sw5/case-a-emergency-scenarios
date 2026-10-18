import { FlatList, Text, View } from 'react-native';
import { box, text } from '../Theme';
import type { Scenario } from '../types/v1/scenario';
import { countManned } from './stationState';
import StationRow, { type Activation } from './StationRow';

// this should 
const LINE_ORDER = ['Station B', 'Station A', 'Station C'];

type Props = {
  scenario: Scenario;
  activeState: Activation;
};

export default function ScenarioStationList({ scenario, activeState }: Props) {

  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion
  );

  const rows = [...(version?.stationRequirements ?? [])].sort(
  (a, b) => LINE_ORDER.indexOf(a.station) - LINE_ORDER.indexOf(b.station)
  );

  const coveredCount = countManned(activeState, rows);

  return (
    <FlatList // we dont currently have a station order.
      data={rows}
      keyExtractor={(item) => item.station}
      ListHeaderComponent={
        <View style={[box, { margin: 8 }]}>
          <Text style={text.title}>
            {coveredCount}/{rows.length} stations covered
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <StationRow requirement={item} activeState={activeState} />
      )}
    />
  );
}