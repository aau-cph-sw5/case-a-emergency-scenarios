import { Pressable, Text, View } from 'react-native';
import { box, colors, surface, text } from '../../shared/Theme';

// Pure list of scenario buttons; the selected (or hovered) one is inverted.
export default function ScenarioSelector({ scenarios, selectedId, onSelect }: {
  scenarios: any[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return (
    <View>
      {scenarios.map((s: any) => (
        <Pressable
          key={s.scenarioId}
          onPress={() => onSelect(s.scenarioId)}
          style={({ hovered }: any) => {
            const on = hovered || s.scenarioId === selectedId;
            return {
              ...box,
              marginBottom: 6,
              backgroundColor: on ? colors.active : surface.backgroundColor,
            };
          }}>
          {({ hovered }: any) => (
            <Text style={[text.body, { color: hovered || s.scenarioId === selectedId ? colors.textInverse : colors.text }]}>
              {s.scenarioId} – {s.name}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
