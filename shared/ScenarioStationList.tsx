import { useState } from 'react';
import { FlatList, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { parseStationRequirements, type Scenario } from './ScenarioParser';
import { colors, radius, surface, text } from './Theme';



export default function ScenarioStationList({ scenario, onConfirmPlacement }: { scenario: Scenario; onConfirmPlacement?: (row: any) => void }) {
  const rows = parseStationRequirements(scenario);
  const [selected, setSelected] = useState<any>(null);
  const handleConfirm = () => {onConfirmPlacement?.(selected); setSelected(null);};
  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(item, index) => String(index)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setSelected(item)}>
            <Text style={text.title}>{item.station} - required Staff: {item.staff}</Text>
              <Text style={text.body}>
                {item.placement} {'\n'}
                {item.times.join('\n')}{'\n'}
                {item.actions.join('\n')}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!selected} onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modal} onPress={() => setSelected(null)}>
          <Text style={text.title}>{selected?.station}</Text>
          <Text style={text.body}>
            location: {selected?.placement}{'\n'}{'\n'}
            Staff required: {selected?.staff}{'\n'}{'\n'}
            {selected?.times.join('\n')}{'\n'}{'\n'}
            {selected?.actions.join('\n')}{'\n'}{'\n'}
          </Text>
        </Pressable>

        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={text.button}>Confirm placement</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...surface, padding: 8, marginBottom: 8},
  modal: { ...surface, flex: 1, padding: 24, paddingTop: 60 },
  confirmButton: {
    backgroundColor: colors.action,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
    margin: 40,
  },
});