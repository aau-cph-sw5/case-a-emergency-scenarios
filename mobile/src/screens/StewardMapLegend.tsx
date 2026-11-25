import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import {
  colors,
  coverageColors,
  spacing,
  steward,
} from "../../../shared/Theme";

const COVERAGE_ITEMS = [
  ["covered", "Bemandet"],
  ["partial", "Delvist"],
  ["gap", "Mangler"],
] as const;

// Minimal Danish legend for the full-line steward map overlay (MET-A-031, #467).
export function StewardMapLegend() {
  return (
    <View style={styles.legend} testID="map-overlay-legend">
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle
              cx={12}
              cy={12}
              r={9}
              fill={colors.background}
              stroke={colors.text}
              strokeWidth={3}
            />
            <SvgText
              x={12}
              y={16}
              textAnchor="middle"
              fontSize={12}
              fontWeight="bold"
              fill={colors.text}
            >
              2
            </SvgText>
          </Svg>
          <Text style={styles.legendText}>Tal = krævede stewards</Text>
        </View>

        <View style={styles.legendItem}>
          <Svg width={22} height={22} viewBox="0 0 28 28">
            <Circle
              testID="legend-own-station-gap"
              cx={14}
              cy={14}
              r={9.5}
              fill="none"
              stroke={colors.background}
              strokeWidth={2}
            />
            <Circle
              testID="legend-own-station-ring"
              cx={14}
              cy={14}
              r={11.5}
              fill="none"
              stroke={colors.text}
              strokeWidth={2}
            />
            <Circle
              cx={14}
              cy={14}
              r={7}
              fill={colors.background}
              stroke={colors.text}
              strokeWidth={2.5}
            />
          </Svg>
          <Text style={styles.legendText}>Din station</Text>
        </View>

        <View style={styles.legendItem}>
          <Svg width={26} height={14} viewBox="0 0 26 14">
            <Line
              testID="legend-blocked-track"
              x1={1}
              y1={7}
              x2={25}
              y2={7}
              stroke={colors.blockedTrack}
              strokeWidth={4}
              strokeDasharray="6 4"
            />
          </Svg>
          <Text style={styles.legendText}>Spærret spor</Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        {COVERAGE_ITEMS.map(([level, label]) => (
          <View key={level} style={styles.legendItem}>
            <View
              testID={`legend-coverage-${level}`}
              style={[
                styles.coverageDot,
                { backgroundColor: coverageColors[level].fill },
              ]}
            />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    backgroundColor: steward.strip,
    borderTopColor: steward.line,
    borderTopWidth: 1,
    gap: spacing.small,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.medium,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.small,
  },
  coverageDot: {
    borderColor: colors.text,
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  legendText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
});
