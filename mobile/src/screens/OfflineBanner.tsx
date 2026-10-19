import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ageInMinutes,
  formatSyncTime,
  isStale,
} from "../../../shared/offline/scenario-snapshot";
import {
  COPY_LABELS,
  type CopyReason,
} from "../../../shared/offline/copy-reason";
import { box, colors, palette } from "../../../shared/Theme";

const TICK_MS = 60_000;

// Shown for as long as the steward reads the saved copy instead of live data
// (MET-A-005 criteria 2-4). The clock ticks every minute, so a copy that
// grows old while the steward reads it still turns red.
export function OfflineBanner({
  savedAt,
  reason,
}: {
  savedAt: string;
  reason: CopyReason;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const stale = isStale(savedAt, now);

  return (
    <View
      style={[styles.banner, stale && styles.stale]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, stale && styles.staleText]}>
        {COPY_LABELS[reason]} · sidst opdateret {formatSyncTime(savedAt, now)}
      </Text>
      {stale && (
        <Text style={[styles.text, styles.staleText]}>
          Kopien er {ageInMinutes(savedAt, now)} min gammel
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...box,
    backgroundColor: palette.metroLineTwo,
    marginBottom: 12,
  },
  stale: {
    backgroundColor: palette.metroDeepRed,
  },
  text: {
    color: colors.text,
    fontWeight: "600",
  },
  staleText: {
    color: colors.textInverse,
  },
});
