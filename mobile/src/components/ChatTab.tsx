import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GestureResponderHandlers } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, panelRadius, steward, text } from "../../../shared/Theme";

// The tab is this wide on the screen, and takes touches this much further to
// the left, so it covers little of the list beside it.
const TAB_WIDTH = 32;
const TAB_SLOP = 16;

// The black tab on the right edge of the steward's screen that opens the
// station's chat (MET-A-029, #335). A tap opens it; dragHandlers let the
// screen pull the chat in while the tab is dragged to the left. A red badge
// counts the messages from the control room the steward has not opened yet
// (MET-A-029, #336); the screen reader hears the count in the tab's name.
export function ChatTab({
  onPress,
  dragHandlers,
  unread = 0,
}: {
  onPress: () => void;
  dragHandlers: GestureResponderHandlers;
  unread?: number;
}) {
  return (
    <View style={styles.tab} {...dragHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread === 0
            ? "Åbn chat med kontrolrummet"
            : `Åbn chat med kontrolrummet, ${unread} ${unread === 1 ? "ny besked" : "nye beskeder"}`
        }
        onPress={onPress}
        // Narrow so it keeps clear of the list's text, but as easy to hit as
        // a 48 wide button.
        hitSlop={{ left: TAB_SLOP }}
        style={styles.press}
        testID="chat-tab"
      >
        <ChatIcon />
        <Text style={styles.label}>CHAT</Text>
      </Pressable>
      {unread > 0 && (
        <View
          style={styles.unread}
          testID="chat-unread"
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.unreadText}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      )}
    </View>
  );
}

// Material Symbols' "chat", filled, as Metro uses its icons.
function ChatIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 -960 960 960">
      <Path
        d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z"
        fill={colors.textInverse}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Sits on the tab's top left corner, outlined in white so it stands out
  // against both the black tab and the white screen.
  unread: {
    alignItems: "center",
    backgroundColor: steward.chat.controlRoom,
    borderColor: colors.background,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    left: -11,
    minWidth: 22,
    paddingHorizontal: 3,
    position: "absolute",
    top: -9,
  },
  unreadText: {
    color: steward.chat.onControlRoom,
    fontSize: 11,
    fontWeight: "700",
  },
  tab: {
    backgroundColor: steward.black,
    borderBottomLeftRadius: panelRadius,
    borderTopLeftRadius: panelRadius,
    height: 96,
    position: "absolute",
    right: 0,
    top: "58%",
    width: TAB_WIDTH,
  },
  press: {
    alignItems: "center",
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  // The word turns to run up the tab, which is too narrow for it across.
  label: {
    ...text.label,
    color: colors.textInverse,
    fontSize: 10,
    marginVertical: 8,
    textAlign: "center",
    transform: [{ rotate: "-90deg" }],
    width: 40,
  },
});
