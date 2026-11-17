import { createContext, use, useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, motion, panelRadius, steward } from "../../../shared/Theme";

// The open height of a ListSection, shared by the sections of one card: they
// open into the same room, so a section that has not been open yet still
// knows its full size.
const OpenHeightContext = createContext<{
  height: number;
  report: (height: number) => void;
}>({ height: 0, report: () => {} });

// THE card under the status card (#376): one frame, the same size in every
// view, for the station list and for the tasks of the own station. Only what
// is inside it changes. It fills the room the status card leaves.
export function ListCard({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);
  const report = (next: number) => {
    if (next > height) setHeight(next);
  };
  return (
    <OpenHeightContext value={{ height, report }}>
      <View style={styles.card}>{children}</View>
    </OpenHeightContext>
  );
}

// THE heading strip of a part of the ListCard: a title, and optionally an
// action word on the right that opens or closes the part (onPress).
export function ListStrip({
  title,
  action,
  onPress,
  first = false,
}: {
  title: ReactNode;
  action?: string;
  onPress?: () => void;
  // The first strip sits at the top of the card, without a line above it.
  first?: boolean;
}) {
  const content = (
    <>
      {typeof title === "string" ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        title
      )}
      {action !== undefined && <Text style={styles.action}>{action}</Text>}
    </>
  );
  // Always the same element, also when it cannot be pressed: a strip that
  // changed from a plain View to a Pressable was made anew, and a new block
  // jumps to its place instead of moving there with the layout.
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={onPress === undefined}
      onPress={onPress}
      style={[styles.strip, !first && styles.divided]}
    >
      {content}
    </Pressable>
  );
}

// THE way a part of the ListCard opens and closes (#377). The content is
// always laid out at its full, open size and pinned to the edge of the part
// that stands still (anchor). When the part opens or closes, its share of the
// card's room (flexGrow) moves from all to nothing or back over the layout
// time, and the moving edge uncovers or covers the content pixel by pixel,
// like a frame sliding over it. The text itself never moves, fades or appears
// late. The part animates its own share, not LayoutAnimation: on Android,
// LayoutAnimation did not move it at all, and the strip jumped.
//
// Example: the tasks after check in are pinned to the bottom of their part,
// so the strip above them sliding up uncovers them from the top down; the
// other stations are pinned to the top, so the tasks strip sliding down
// uncovers them. Open, the part takes the room left in the card; closed, it
// has no height and its content is hidden from touch and screen readers.
export function ListSection({
  open,
  anchor,
  children,
  testID,
}: {
  open: boolean;
  anchor: "top" | "bottom";
  children: ReactNode;
  testID?: string;
}) {
  // The open height, kept while the part is closed, so the content keeps
  // its size (and its place) while the part closes and opens again.
  const { height, report } = use(OpenHeightContext);
  // The part's share of the room: 1 open, 0 closed. The two parts of a card
  // move at the same pace, so together they always fill it.
  const [share] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    Animated.timing(share, {
      toValue: open ? 1 : 0,
      duration: motion.layoutMs,
      easing: Easing.inOut(Easing.ease),
      // flexGrow is layout, which only runs on the JavaScript side.
      useNativeDriver: false,
    }).start();
  }, [open, share]);
  return (
    <Animated.View
      style={[{ flexGrow: share }, styles.part, styles.clip]}
      onLayout={(event) => {
        if (open) report(event.nativeEvent.layout.height);
      }}
      pointerEvents={open ? "auto" : "none"}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!open}
      testID={testID}
    >
      <View
        testID={testID && `${testID}-content`}
        style={
          height > 0
            ? { position: "absolute", left: 0, right: 0, [anchor]: 0, height }
            : // Not measured yet (the first time it is open): in the flow.
              styles.open
        }
      >
        {children}
      </View>
    </Animated.View>
  );
}

// The text style of a strip's title, for a title built from several parts
// (for example with one word in red).
export const listStripTitle = StyleSheet.create({
  text: { color: colors.text, fontSize: 14, fontWeight: "700" },
}).text;

const styles = StyleSheet.create({
  open: { flex: 1 },
  // A part starts from no height and takes its share of the room (flexGrow).
  part: { flexBasis: 0, flexShrink: 1 },
  clip: { overflow: "hidden" },
  card: {
    backgroundColor: colors.background,
    borderColor: steward.line,
    borderRadius: panelRadius,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  strip: {
    alignItems: "center",
    backgroundColor: steward.strip,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: 15,
  },
  divided: {
    borderTopColor: steward.line,
    borderTopWidth: 1,
  },
  title: { color: colors.text, fontSize: 14, fontWeight: "700" },
  action: { color: steward.muted, fontSize: 12, fontWeight: "700" },
});
