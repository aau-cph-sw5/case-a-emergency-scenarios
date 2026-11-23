import { useCallback, useEffect } from "react";
import { StyleSheet, Text, Vibration, View } from "react-native";
import { colors, steward } from "../../../shared/Theme";
import type { ActiveScenarioView } from "../../../shared/offline/use-active-scenario";
import { DARK_DIM, ShineText } from "../components/ShineText";
import { clockTime } from "../clock-time";
import { SwipeToDismiss } from "../components/SwipeToDismiss";
import { overlayRadius, TopOverlay } from "../components/TopOverlay";

// What the steward is told when the scenario was activated, switched or stood
// down. The words live here once; where they show depends on the kind:
// stood down turns the status card into a red message card (NoticeCard),
// the others show as notifications over the screen (NoticeStack).
export type ScenarioNotice = {
  id: number;
  time: string;
  title: string;
  text: string;
};
export type StoodDownNotice = { title: string; text: string };

export function stoodDownNotice(
  view: ActiveScenarioView,
): StoodDownNotice | null {
  return view.status === "stood-down"
    ? {
        title: "Scenariet er afsluttet",
        text: `“${view.scenarioName}” er deaktiveret af kontrolrummet. Genoptag normal drift.`,
      }
    : null;
}

// The notifications waiting, newest first.
export function liveNotices(view: ActiveScenarioView): ScenarioNotice[] {
  if (view.status !== "live") return [];
  const { name } = view.snapshot.scenario;
  return view.notices
    .map((notice) =>
      notice.kind === "activated"
        ? {
            id: notice.id,
            time: clockTime(notice.at),
            title: "Nyt scenarie aktiveret",
            text: `“${name}” er aktiveret af kontrolrummet.`,
          }
        : {
            id: notice.id,
            time: clockTime(notice.at),
            title: "Scenariet er skiftet",
            text: `“${notice.from}” er afløst af “${name}”.`,
          },
    )
    .reverse();
}

// The notifications over the screen: one classic Android card each (the
// heads-up kind), stacked at the top, the newest first. Each stays until the
// steward swipes it sideways away (see SwipeToDismiss).
export function NoticeStack({
  notices,
  onDismiss,
}: {
  notices: ScenarioNotice[];
  onDismiss: (id: number) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <TopOverlay>
      {notices.map((notice) => (
        <NoticeBanner key={notice.id} notice={notice} onDismiss={onDismiss} />
      ))}
    </TopOverlay>
  );
}

// A light rounded card with a header row (icon, app name, the time the scenario was activated), the title in
// bold and the text under it. It is made to be noticed: a red edge on the
// left, a red icon and a short vibration when it arrives.
function NoticeBanner({
  notice,
  onDismiss,
}: {
  notice: ScenarioNotice;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    Vibration.vibrate(VIBRATION_MS);
  }, []);
  const { id } = notice;
  const dismiss = useCallback(() => onDismiss(id), [onDismiss, id]);
  return (
    <SwipeToDismiss onDismiss={dismiss}>
      <View
        accessibilityRole="alert"
        accessibilityLabel={`${notice.title}. ${notice.text}`}
        style={styles.notice}
      >
        <View style={styles.edge} />
        <View style={styles.body}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Text style={styles.iconLetter}>M</Text>
            </View>
            <Text style={styles.app}>
              {notice.time === ""
                ? "Metro Service"
                : `Metro Service · ${notice.time}`}
            </Text>
          </View>
          <ShineText style={styles.title} dim={DARK_DIM} bright={colors.text}>
            {notice.title}
          </ShineText>
          <Text style={styles.text}>{notice.text}</Text>
        </View>
      </View>
    </SwipeToDismiss>
  );
}

const VIBRATION_MS = 250;

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.background,
    borderRadius: overlayRadius,
    elevation: 8,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  edge: { backgroundColor: steward.red, width: 8 },
  body: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  icon: {
    alignItems: "center",
    backgroundColor: steward.red,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  iconLetter: { color: colors.textInverse, fontSize: 16, fontWeight: "700" },
  app: { color: steward.muted, fontSize: 12 },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  text: { color: colors.text, fontSize: 14 },
});
