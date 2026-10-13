import { StyleSheet, View } from 'react-native';

// or any files within the Snack
import scenario from '../mockData/Scenario.json';
import ScenarioMapInitializer from '../shared/ScenarioMapInitializer';
import ScenarioStationList from '../shared/ScenarioStationList';
import { page } from '../shared/Theme';
import DefaultMapInitializer from '../shared/defaultMapInitializer';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <ScenarioMapInitializer scenario={scenario} />
      </View>
        <ScenarioStationList scenario={scenario} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...page,
    paddingTop: 60, // empty space above the map
  },
  map: {
    width: '100%',
    maxWidth: 600,
    height: 320,
    marginBottom: 20,
  },
});