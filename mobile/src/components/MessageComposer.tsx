import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";
import {
  isSendableText,
  MAX_MESSAGE_LENGTH,
  messageLength,
} from "../data/station-thread";

// The counter above the text field shows from this many characters.
const COUNTER_FROM = 900;

// Where the steward writes to the control room (MET-A-029, #335): a text
// field and Send. Send can be used only for text the server would accept.
export function MessageComposer({
  draft,
  onChangeDraft,
  onSend,
}: {
  draft: string;
  onChangeDraft: (draft: string) => void;
  onSend: () => void;
}) {
  const length = messageLength(draft.trim());
  const tooLong = length > MAX_MESSAGE_LENGTH;
  const canSend = isSendableText(draft.trim());
  return (
    <>
      {length >= COUNTER_FROM && (
        <Text style={[styles.counter, tooLong && styles.counterOver]}>
          {length} / {MAX_MESSAGE_LENGTH}
        </Text>
      )}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Skriv til kontrolrummet"
          placeholderTextColor={steward.muted}
          cursorColor={steward.black}
          selectionColor={steward.chat.inputBorder}
          accessibilityLabel="Besked til kontrolrummet"
          multiline
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send besked"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={[styles.send, !canSend && styles.sendDisabled]}
        >
          <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>
            Send
          </Text>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M3 20l18-8L3 4v6l12 2-12 2z"
              fill={canSend ? colors.textInverse : steward.lockedText}
            />
          </Svg>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  counter: {
    color: steward.muted,
    fontSize: 12,
    paddingHorizontal: spacing.large,
    textAlign: "right",
  },
  counterOver: {
    color: steward.nobody,
    fontWeight: "700",
  },
  composer: {
    alignItems: "flex-end",
    borderTopColor: steward.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.small * 2,
    padding: spacing.medium,
  },
  input: {
    borderColor: steward.chat.inputBorder,
    borderRadius: panelRadius,
    borderWidth: 1.5,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    maxHeight: 140,
    minHeight: 48,
    paddingHorizontal: spacing.medium,
    paddingVertical: 12,
  },
  send: {
    alignItems: "center",
    backgroundColor: steward.black,
    borderRadius: panelRadius,
    flexDirection: "row",
    gap: 6,
    height: 48,
    paddingHorizontal: spacing.large,
  },
  sendDisabled: {
    backgroundColor: steward.locked,
  },
  sendText: {
    ...text.button,
  },
  // A Send that cannot be used yet looks like a locked slide.
  sendTextDisabled: {
    color: steward.lockedText,
  },
});
