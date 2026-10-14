import { FlatList, Text, Pressable } from 'react-native';
import { parseStationRequirements, type Scenario } from './tinyParser';
import { text } from './Theme';

export default function ScenarioStationList({ scenario }: { scenario: Scenario }) {
  const rows = parseStationRequirements(scenario);

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, index) => String(index)}
      renderItem={({ item }) => (
        <Pressable>
          <Text style={text.title}>
            {item.station} - required Staff: {item.staff}
          </Text>
          <Text style={text.body}>
            {item.placement}{'\n'}
            {item.times.join('\n')}{'\n'}
            {item.actions.join('\n')}
          </Text>
        </Pressable>
      )}
    />
  );
}