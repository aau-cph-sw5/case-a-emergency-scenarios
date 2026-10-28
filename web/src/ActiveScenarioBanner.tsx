import { StyleSheet, Text, View } from "react-native";
import { box, colors, text } from "../../shared/Theme";
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
            <View style={[styles.dot, styles.dotActive]} />
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
    ...box,
    position: "sticky" as "absolute",
    top: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
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
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotActive: { backgroundColor: colors.statusGreen },
  dotIdle: { backgroundColor: colors.statusRed },
  // Equal side slots keep the middle text centred, with or without a line.
  side: { flex: 1 },
  line: { alignItems: "flex-end" },
  title: { ...text.title },
  meta: { ...text.body },
});
