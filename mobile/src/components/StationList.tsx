import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../shared/Theme";

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

// Colours and spacing come from shared/Theme so the list matches the other views.
const styles = StyleSheet.create({
  station: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: spacing.medium,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.large,
  },
  current: {
    backgroundColor: colors.active, // selected state is inverted, as elsewhere in the app
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  currentLabel: {
    color: colors.textInverse,
  },
});
