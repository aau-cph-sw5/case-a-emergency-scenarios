import { useState } from 'react';
import { Text, View } from 'react-native';
import ScenarioMapInitializer from '../../shared/ScenarioMapInitializer';
import ScenarioStationList from '../../shared/ScenarioStationList';
import ScenarioSelector from './ScenarioSelector';
import SidePanel from './SidePanel';
import scenarios from './scenarios';
import { surface, text } from '../../shared/Theme';

// Admin-panel layout
export default function App() {
  const [id, setId] = useState(scenarios[0].scenarioId);
  const scenario = scenarios.find((s: any) => s.scenarioId === id);

  return (
    <View style={[surface, { flex: 1 }]}>
      <Text style={[text.header, { padding: 12 }]}>
        Administration
      </Text>

      <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ScenarioSelector scenarios={scenarios} selectedId={id} onSelect={setId} />
        </View>

        <View style={{ flex: 2 }}>
          <ScenarioMapInitializer key={id} scenario={scenario} />
        </View>

        <View style={{ flex: 1 }}>
          <SidePanel>
            <ScenarioStationList scenario={scenario} />
          </SidePanel>
        </View>
      </View>
    </View>
  );
}
