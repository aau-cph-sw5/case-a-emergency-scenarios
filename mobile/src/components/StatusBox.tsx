import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { spacing, steward } from "../../../shared/Theme";

// How many are at a station and on the way, in the same words in the status
// box and in the station list (#375, #376).
export function staffingWords(arrived: number, enRoute: number): string {
  const parts = [
    arrived > 0 ? `${arrived} på stationen` : null,
    enRoute > 0 ? `${enRoute} på vej` : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Ingen tildelt";
}

export type StatusChip = { label: string; background: string; color: string };
// How a station is staffed: how many it needs, how many are there and how
// many are on the way.
export type Staffing = { needed: number; arrived: number; enRoute: number };
// The colours of the status card the box sits in (steward.card).
export type CardLook = { background: string; text: string; label: string };

// The status at the top of the status card (#375, #376): the scenario with
// the connection dot, the station, a chip with the steward's status and the
// staffing bar under the name. It is the same height in every state, so nothing below
// it moves when the status changes. It has no colour of its own: it shows on
// the status card, whose colour says the status (look gives its text colours).
// A new status arrives with the turn of the whole card (Swap); screen
// readers hear it.
export function StatusBox({
  station,
  chip,
  staffing = null,
  scenario,
  connected = true,
  look,
  ready = true,
}: {
  station: string;
  chip: StatusChip;
  // The own station's staffing, shown as a bar under the name: one segment per
  // steward the station needs.
  staffing?: Staffing | null;
  // The active scenario, between STATION and STATUS: the context of the card.
  scenario?: string;
  connected?: boolean;
  look: CardLook;
  // False until the steward's own status has been read: the box then shows
  // a small spinner instead of a status that may be wrong ("Ingen station"
  // for a steward who is on the way), and the real status appears in place.
  ready?: boolean;
}) {
  // Screen readers hear a new status; the card's turn shows it to the eye.
  const spoken = `${chip.label}, ${station}`;
  const spokenRef = useRef(spoken);
  useEffect(() => {
    if (ready && spoken !== spokenRef.current) {
      AccessibilityInfo.announceForAccessibility(spoken);
    }
    spokenRef.current = spoken;
  }, [ready, spoken]);

  const label = [styles.label, { color: look.label }];
  return (
    <View style={styles.box} testID="status-box">
      <View style={styles.labels}>
        <Text style={label}>STATION</Text>
        {scenario !== undefined && (
          <View
            style={styles.scenario}
            accessible
            accessibilityLabel={`${scenario}, ${connected ? "forbundet" : "ingen forbindelse"}`}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: connected ? steward.online : steward.red,
                  borderColor: look.background,
                },
              ]}
            />
            <Text
              style={[styles.scenarioName, { color: look.text }]}
              numberOfLines={1}
            >
              {scenario}
            </Text>
          </View>
        )}
        <Text style={label}>STATUS</Text>
      </View>
      {!ready && (
        <ActivityIndicator
          color={look.label}
          style={styles.loading}
          testID="status-loading"
        />
      )}
      <View style={[styles.nameRow, !ready && styles.hidden]}>
        <Text style={[styles.name, { color: look.text }]} numberOfLines={1}>
          {station}
        </Text>
        <Text
          style={[
            styles.chip,
            { backgroundColor: chip.background, color: chip.color },
          ]}
        >
          {chip.label}
        </Text>
      </View>
      {/* The bar's place keeps its height without a bar. */}
      <View style={styles.slot}>
        {ready && staffing !== null && staffing.needed > 0 && (
          <StaffingBar staffing={staffing} look={look} />
        )}
      </View>
    </View>
  );
}

// The station's staffing as a slim bar (#376): one segment per steward the
// station needs, in the same colours everywhere: green for one who has
// arrived, yellow for one on the way, red for a place nobody has taken, with
// a small gap between segments. On a card of its own colour a segment takes
// a shade of it that still shows (steward.yellowOnYellow, greenOnGreen).
// Screen readers hear the same words as the station list.
function StaffingBar({
  staffing,
  look,
}: {
  staffing: Staffing;
  look: CardLook;
}) {
  const { needed, arrived, enRoute } = staffing;
  const shade = (colour: string, onOwnCard: string) =>
    colour === look.background ? onOwnCard : colour;
  return (
    <View
      style={styles.bar}
      accessible
      accessibilityLabel={staffingWords(arrived, enRoute)}
      testID="staffing-bar"
    >
      {Array.from({ length: needed }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor:
                index < arrived
                  ? shade(steward.green, steward.greenOnGreen)
                  : index < arrived + enRoute
                    ? shade(steward.yellow, steward.yellowOnYellow)
                    : steward.red,
            },
          ]}
        />
      ))}
    </View>
  );
}

// The air between the things in the box, the same as the map has to the edge
// of the card (the status card's INSIDE), and the bar's thickness.
const AIR = spacing.small * 2;
const BAR_HEIGHT = 4;

const styles = StyleSheet.create({
  // Every gap is AIR (8, the same as between the map and the edge of the
  // card), and a little more (12) between the bar and the map. The box has no height of its own: the bar's place is always as high
  // as the bar, also when there is no bar, so the box is the same height in
  // every state and the card never changes size.
  box: {
    paddingBottom: AIR + 4,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  slot: { height: BAR_HEIGHT, marginTop: AIR },
  loading: {
    left: 16,
    position: "absolute",
    top: 48,
  },
  hidden: {
    opacity: 0,
  },
  labels: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  scenario: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 6,
  },
  dot: {
    borderRadius: 5,
    borderWidth: 1.5,
    height: 10,
    width: 10,
  },
  scenarioName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  nameRow: {
    marginTop: AIR,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  name: {
    flexShrink: 1,
    fontSize: 28,
    fontWeight: "700",
  },
  chip: {
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bar: {
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    borderRadius: 2,
    flex: 1,
    height: BAR_HEIGHT,
  },
});
