import { StyleSheet, Text, View } from "react-native";
import { dotSize, palette, radius, spacing, text } from "../../shared/Theme";
import type { ActiveActivations } from "./useActiveActivations";

function startedLabel(startedAt: string) {
  return new Date(startedAt).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Shown by App above every view, so an active scenario is visible wherever
// the operator is (MET-A-007 criterion 3). Shows the scenario name, falling
// back to scenarioId; the line is not shown yet.
export function ActiveScenarioBanner({
  active,
  names,
  error,
  loading,
}: ActiveActivations) {
  return (
    <View aria-label="Aktive scenarier" role="complementary" style={styles.bar}>
      {error !== null ? (
        <View role="alert" style={styles.row}>
          <View style={[styles.dot, styles.dotIdle]} />
          <Text style={styles.meta}>
            Kunne ikke hente aktive scenarier: {error}
          </Text>
        </View>
      ) : loading ? (
        <View role="status" style={styles.row}>
          <Text style={styles.meta}>Henter aktive scenarier…</Text>
        </View>
      ) : active.length === 0 ? (
        <View role="status" style={styles.row}>
          <View style={[styles.dot, styles.dotIdle]} />
          <Text style={styles.meta}>Ingen aktive scenarier</Text>
        </View>
      ) : (
        active.map((a) => (
          <View key={a.scenarioId} style={styles.item}>
            <View style={styles.dot} />
            <Text style={[styles.title, styles.side]}>
              {names.get(a.scenarioId)?.name ?? a.scenarioId}
            </Text>
            <Text style={styles.meta}>
              Aktivt scenarie · {startedLabel(a.startedAt)}
            </Text>
            {/* The line goes here, right-aligned, once real line data exists. */}
            <View style={[styles.side, styles.line]} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // position sticky is web only, so the types do not know it. The control-room
  // dashboard runs on the web.
  bar: {
    position: "sticky" as "absolute",
    top: 0,
    zIndex: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.metroBlack,
    borderBottomWidth: 1,
    borderColor: palette.barBorder,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  item: {
    flex: 1,
    flexBasis: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: palette.barBorder,
    borderRadius: radius,
  },
  dot: {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: palette.metroLineOne,
  },
  dotIdle: { backgroundColor: palette.metroLineThree },
  // Equal side slots keep the middle text centred, with or without a line.
  side: { flex: 1 },
  line: { alignItems: "flex-end" },
  title: { ...text.title, color: palette.metroWhite },
  meta: { ...text.meta, color: palette.metroWhite, textAlign: "center" },
});
