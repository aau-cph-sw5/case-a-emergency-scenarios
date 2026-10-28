import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  COPY_LABELS,
  type CopyReason,
} from "../../../shared/offline/copy-reason";
import {
  ageInMinutes,
  formatSyncTime,
  isStale,
} from "../../../shared/offline/scenario-snapshot";
import { box, colors, palette } from "../../../shared/Theme";

const TICK_MS = 60_000;

// Shown for as long as the steward reads the saved copy instead of live data
// (MET-A-005 criteria 2-4). The clock ticks every minute, so a copy that
// grows old while the steward reads it still turns red.
export function OfflineBanner({
  savedAt,
  reason,
  onRetry,
}: {
  savedAt: string;
  reason: CopyReason;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const stale = isStale(savedAt, now);
  const age = ageInMinutes(savedAt, now);
  const textStyle = [styles.text, stale && styles.staleText];

  return (
    <View
      style={[styles.banner, stale && styles.stale]}
      accessibilityRole="alert"
    >
      <View style={styles.texts}>
        <Text style={[textStyle, styles.label]}>
          {COPY_LABELS[reason]} · gemt kopi
        </Text>
        <Text style={textStyle}>
          Sidst opdateret {formatSyncTime(savedAt, now)}
        </Text>
        {stale && (
          <Text style={[textStyle, styles.label]}>
            {age === null
              ? "Telefonens ur er ændret, kopiens alder er ukendt"
              : `Kopien er ${age} min gammel og kan være forældet`}
          </Text>
        )}
      </View>
      <Pressable
        style={[styles.button, stale && styles.staleButton]}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={textStyle}>Prøv igen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...box,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: palette.metroLineTwo,
    marginBottom: 12,
  },
  stale: {
    backgroundColor: palette.metroDeepRed,
  },
  texts: {
    flex: 1,
  },
  text: {
    color: colors.text,
  },
  label: {
    fontWeight: "600",
  },
  staleText: {
    color: colors.textInverse,
  },
  button: {
    ...box,
    paddingHorizontal: 12,
  },
  staleButton: {
    borderColor: colors.textInverse,
  },
});
