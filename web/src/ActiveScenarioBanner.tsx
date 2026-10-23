import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radius } from "../../shared/Theme";
import { fetchActiveActivations } from "./activations";
import { describeCovers } from "./lines";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";
import { socket } from "./socket";
import { userMessage } from "./get-json";
import type { ScenarioState } from "./scenario-state";

// The socket tells the banner when an activation happens. The poll is the
// fallback for a dropped socket or an event missed while offline.
const POLL_MS = 30_000;

function startedLabel(startedAt: string) {
  return new Date(startedAt).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Shown by App above every view, so an active scenario is visible wherever
// the operator is (MET-A-007 criterion 3). Shows the scenario name, falling
// back to scenarioId; the line is not shown yet.
export function ActiveScenarioBanner({ token }: { token: string }) {
  const [active, setActive] = useState<ScenarioState[]>([]);
  const [names, setNames] = useState<Map<string, ScenarioSummary>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Only the newest load may set state, so a slow older one cannot
    // overwrite a newer answer.
    let latest = 0;
    async function load() {
      const mine = ++latest;
      try {
        const [activations, scenarios] = await Promise.all([
          fetchActiveActivations(token, controller.signal),
          fetchScenarios(token, controller.signal),
        ]);
        if (mine !== latest) return;
        setNames(new Map(scenarios.map((s) => [s.scenarioId, s])));
        setActive(activations);
        setError(null);
      } catch (e) {
        if (controller.signal.aborted || mine !== latest) return;
        console.error(e);
        setError(userMessage(e));
      }
    }
    const timer = setInterval(load, POLL_MS);
    // App opens the socket. "connect" also fires on a reconnect, which catches up on missed events.
    socket.on("connect", load);
    socket.on("activations-changed", load);
    load();
    return () => {
      controller.abort();
      clearInterval(timer);
      socket.off("connect", load);
      socket.off("activations-changed", load);
    };
  }, [token]);

  // ISO timestamps sort as text; the numbering is the order of activation.
  const oldestFirst = [...active].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );

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
        oldestFirst.map((a, i) => (
          <ScenarioItem
            key={a.scenarioId}
            title={names.get(a.scenarioId)?.name ?? a.scenarioId}
            meta={`Aktivt scenarie ${i + 1}. · ${startedLabel(a.startedAt)}`}
            covers={describeCovers(names.get(a.scenarioId)?.covers)}
          />
        ))
      )}
    </View>
  );
}

// ponytail: the hover only hints that the box can become a link to the scenario.
function ScenarioItem({
  title,
  meta,
  covers,
}: {
  title: string;
  meta: string;
  covers: string[];
}) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={[styles.item, hover && styles.itemHover]}
    >
      <View style={styles.dot} />
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
        {covers.map((c) => (
          <Text key={c} style={styles.cover}>
            {c}
          </Text>
        ))}
      </View>
    </Pressable>
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
  itemHover: { backgroundColor: palette.barHover, cursor: "pointer" },
  info: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 24,
    rowGap: 4,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.metroLineOne,
  },
  dotIdle: { backgroundColor: palette.metroLineThree },
  title: { color: palette.metroWhite, fontSize: 18, fontWeight: "bold" },
  meta: { color: palette.metroWhite, fontSize: 14, opacity: 0.75 },
  cover: { color: palette.metroWhite, fontSize: 14 },
});
