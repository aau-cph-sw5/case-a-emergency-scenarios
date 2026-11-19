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
// screen pull the chat in while the tab is dragged to the left.
export function ChatTab({
  onPress,
  dragHandlers,
}: {
  onPress: () => void;
  dragHandlers: GestureResponderHandlers;
}) {
  return (
    <View style={styles.tab} {...dragHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Åbn chat med kontrolrummet"
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
