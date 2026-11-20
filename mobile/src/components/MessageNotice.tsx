import { useEffect } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  motion,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";

// The note at the top of the steward's screen when the control room writes
// while the chat is closed (MET-A-029, #336). It names the control room, shows
// the start of the message, and opens the chat when tapped. It goes by itself
// after motion.messageNoticeMs. A screen reader hears it at once.
//
// Only while the app is open: alerts with the app in the background are
// MET-A-018.
export function MessageNotice({
  text: body,
  onOpen,
  onDismiss,
}: {
  text: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Ny besked fra kontrolrummet: ${body}`,
    );
    const timer = setTimeout(onDismiss, motion.messageNoticeMs);
    return () => clearTimeout(timer);
  }, [body, onDismiss]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ny besked fra kontrolrummet: ${body}. Åbn chatten`}
        onPress={onOpen}
        style={styles.notice}
        testID="message-notice"
      >
        <Text style={styles.who}>NY BESKED FRA KONTROLRUM</Text>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // The steward's screen is already inside the app's safe area, so the top
  // of it is below the notch and the clock.
  wrap: {
    left: spacing.large,
    top: spacing.small,
    position: "absolute",
    right: spacing.large,
  },
  notice: {
    backgroundColor: steward.chat.controlRoom,
    borderRadius: panelRadius,
    gap: 4,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
  },
  who: {
    ...text.label,
    color: steward.chat.onControlRoom,
    fontSize: 10,
  },
  body: {
    color: steward.chat.onControlRoom,
    fontSize: 16,
    lineHeight: 22,
  },
});
