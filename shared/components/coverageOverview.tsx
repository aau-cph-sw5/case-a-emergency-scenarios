import { StyleSheet, Text, View } from "react-native";
import {
  colors,
  coverageCell,
  legendSquare,
  ruleWidth,
  spacing,
  statusColors,
  statusLabels,
  text,
  weightBold,
} from "../Theme";
import type { CoverageLevel } from "./stationState";

// DESIGN RATIONALE
// The big number at the top of the operator's staffing plan (Operator Design
// Guide, Status): how many stations are covered, and one cell per station
// below it instead of a percentage bar, so the count can be read off.
//
// - One cell per station, with the station code in it, so the operator reads
//   which stations are open and not only how many. Few stations get a label;
//   a long list falls back to plain cells (a label would not fit).
// - Cells are sorted by status (green, yellow, red) and spaced evenly, so the
//   colour alone groups them (Gestalt law of similarity). They fill the width
//   of the column, at most 5 to a row, and wrap to a new row beyond that.
// - The status is written, not only coloured: each group has its word and
//   count in the legend (Ankommet, På vej, Mangler), and the strip has one
//   spoken summary. Colour only repeats it (WCAG 2.2 SC 1.4.1, Use of Color).
// - Text on a cell is white on green and red, ink on yellow, so every pair is
//   at least 4.5:1 (WCAG 2.2 SC 1.4.3, Contrast Minimum).
// - Flat fills, 4 px corners, no shadow or gradient: the cell carries only the
//   data (Tufte, data-ink ratio; Few, Information Dashboard Design: a status
//   display is read at a glance, so keep it plain).
// Sources: WCAG 2.2 SC 1.4.1 and 1.4.3 (w3.org/WAI/WCAG22/Understanding);
// Wertheimer (1923), Untersuchungen zur Lehre von der Gestalt (proximity);
// Tufte, The Visual Display of Quantitative Information (1983);
// Few, Information Dashboard Design (2006).
const LEVEL_RANK: Record<CoverageLevel, number> = {
  covered: 0,
  partial: 1,
  gap: 2,
};

const LEVEL_LABEL: Record<CoverageLevel, string> = {
  covered: statusLabels.arrived,
  partial: statusLabels.onTheWay,
  gap: statusLabels.missing,
};

// Up to this many stations the cells carry the station code.
const MAX_LABELLED = 12;
// At most this many cells per row; more stations wrap onto a new row.
const MAX_PER_ROW = 5;

export type CoverageStation = { name: string; level: CoverageLevel };

export function CoverageOverview({
  stations,
}: {
  stations: readonly CoverageStation[];
}) {
  const count = (l: CoverageLevel) =>
    stations.filter((x) => x.level === l).length;
  const covered = count("covered");
  // Green first, then yellow, then red.
  const cells = [...stations].sort(
    (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level],
  );
  const labelled = stations.length <= MAX_LABELLED;
  // Balanced rows (6 -> 3+3, not 5+1) so the cells stay about the same width.
  const rowCount = Math.ceil(cells.length / MAX_PER_ROW);
  const perRow = Math.ceil(cells.length / rowCount) || 1;
  const rows = Array.from({ length: rowCount }, (_, r) =>
    cells.slice(r * perRow, (r + 1) * perRow),
  );
  return (
    <View testID="coverage-overview" style={styles.overview}>
      <View style={styles.figure}>
        {stations.length === 0 ? (
          <Text style={styles.label}>Ingen stationer</Text>
        ) : (
          <>
            <Text style={styles.number}>{covered}</Text>
            <Text style={styles.label}>
              af {stations.length} stationer dækket
            </Text>
          </>
        )}
      </View>
      <View
        accessible
        accessibilityLabel={`${covered} dækket, ${count("partial")} ${statusLabels.onTheWay.toLowerCase()}, ${count("gap")} ${statusLabels.missing.toLowerCase()}`}
        style={styles.cells}
      >
        {rows.map((row, r) => (
          // Rows are anonymous and fixed in order, never reordered.
          // eslint-disable-next-line @eslint-react/no-array-index-key
          <View key={r} style={styles.row}>
            {row.map((station, index) => (
              <View
                // eslint-disable-next-line @eslint-react/no-array-index-key
                key={index}
                testID={`coverage-cell-${station.level}`}
                style={[
                  styles.cell,
                  { backgroundColor: statusColors[station.level] },
                ]}
              >
                {labelled && (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cellText,
                      station.level === "partial" && styles.cellTextOnYellow,
                    ]}
                  >
                    {station.name}
                  </Text>
                )}
              </View>
            ))}
            {/* Empty slots keep a short last row's cells the same width. */}
            {Array.from({ length: perRow - row.length }, (_, i) => (
              <View key={`pad-${i}`} style={styles.pad} />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {(["covered", "partial", "gap"] as const).map((level) => (
          <LegendItem
            key={level}
            color={statusColors[level]}
            label={LEVEL_LABEL[level]}
            count={count(level)}
          />
        ))}
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.square, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text testID={`legend-count-${label}`} style={styles.legendCount}>
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overview: { marginBottom: spacing.s18 },
  figure: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.s8,
    paddingBottom: spacing.s6,
    borderBottomWidth: ruleWidth,
    borderBottomColor: colors.text,
  },
  number: {
    ...text.operatorFigureLarge,
    color: colors.text,
  },
  label: { ...text.operatorLabel, color: colors.text, flexShrink: 1 },
  cells: { gap: spacing.small, marginTop: spacing.s14 },
  row: { flexDirection: "row", gap: spacing.small },
  pad: { flex: 1, minWidth: 0 },
  cell: { ...coverageCell, flex: 1, minWidth: 0, justifyContent: "center" },
  cellText: {
    ...text.small,
    fontWeight: weightBold,
    textAlign: "center",
    color: colors.textInverse,
    // Metro's capitals sit about 1px above the middle of the line box (measured
    // at 12px: ascent 9, descent 3, cap height 8), so push them down to centre.
    transform: [{ translateY: 1 }],
  },
  cellTextOnYellow: { color: colors.text },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: spacing.medium,
    rowGap: spacing.small,
    marginTop: spacing.s14,
  },
  // The operator body size: the legend says what the colours mean.
  legendLabel: { ...text.small, ...text.operatorBody },
  legendCount: {
    ...text.small,
    ...text.operatorBody,
    fontWeight: weightBold,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.s5 },
  square: { width: legendSquare, height: legendSquare, flexShrink: 0 },
});
