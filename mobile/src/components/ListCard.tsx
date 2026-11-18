import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, panelRadius, steward } from "../../../shared/Theme";

// THE card under the status card (#376): one frame, the same size in every
// view, for the station list and for the tasks of the own station. Only what
// is inside it changes. It fills the room the status card leaves.
export function ListCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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

// The text style of a strip's title, for a title built from several parts
// (for example with one word in red).
export const listStripTitle = StyleSheet.create({
  text: { color: colors.text, fontSize: 14, fontWeight: "700" },
}).text;

const styles = StyleSheet.create({
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
