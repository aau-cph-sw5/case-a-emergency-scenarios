import { Pressable, StyleSheet, Text, View } from "react-native";

// One button per station, nearest first. Pressing a station reports it as the
// steward's position: one action, no separate confirm button.
export function StationList({
  stations,
  current,
  disabled,
  onSelect,
}: {
  stations: string[];
  current: string | null;
  disabled: boolean;
  onSelect: (station: string) => void;
}) {
  return (
    <View>
      {stations.map((station) => {
        const isCurrent = station === current;
        return (
          <Pressable
            key={station}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: isCurrent }}
            disabled={disabled}
            onPress={() => onSelect(station)}
            style={[
              styles.station,
              isCurrent && styles.current,
              disabled && styles.disabled,
            ]}
          >
            <Text style={[styles.label, isCurrent && styles.currentLabel]}>
              {station}
              {isCurrent ? " (din position)" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  station: {
    backgroundColor: "#ffffff",
    borderColor: "#1b7f3b",
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  current: {
    backgroundColor: "#1b7f3b",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  currentLabel: {
    color: "#ffffff",
  },
});
