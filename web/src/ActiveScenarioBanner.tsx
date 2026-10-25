import { StyleSheet, Text, View } from "react-native";
import { palette, radius } from "../../shared/Theme";
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
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: palette.metroBlack,
    borderBottomWidth: 1,
    borderColor: palette.barBorder,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  item: {
    flex: 1,
    flexBasis: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.barBorder,
    borderRadius: radius,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.metroLineOne,
  },
  dotIdle: { backgroundColor: palette.metroLineThree },
  // Equal side slots keep the middle text centred, with or without a line.
  side: { flex: 1 },
  line: { alignItems: "flex-end" },
  title: { color: palette.metroWhite, fontSize: 18, fontWeight: "bold" },
  meta: {
    color: palette.metroWhite,
    fontSize: 14,
    opacity: 0.75,
    textAlign: "center",
  },
});
