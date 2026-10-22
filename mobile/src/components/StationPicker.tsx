import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text } from "react-native";

// Lets the steward choose the active scenario's stations.
export function StationPicker({
  stations,
  selected,
  onSelect,
}: {
  stations: string[];
  selected: string;
  onSelect: (station: string) => void;
}) {
  return (
    <>
      <Picker
        selectedValue={selected}
        onValueChange={(value) => onSelect(value)}
        style={styles.picker}
      >
        <Picker.Item label="Vælg station…" value="" />
        {stations.map((name) => (
          <Picker.Item key={name} label={name} value={name} />
        ))}
      </Picker>
      {selected !== "" && <Text>Valgt: {selected}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginBottom: 8,
  },
});
