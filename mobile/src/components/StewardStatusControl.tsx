import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  box,
  colors,
  panelRadius,
  spacing,
  stewardStatus,
  surface,
  text,
} from "../../../shared/Theme";
import type { OwnStatus } from "../data/steward-status";
import { SlideToConfirm } from "./SlideToConfirm";

export type StationCoverage = {
  arrived: number;
  enRoute: number;
  needed: number;
};

// The steward's own status in the active scenario (MET-A-015, #263, #305):
// no status, on the way, arrived or checked out. Only the next valid actions
// are offered: on the way, the arrival slide and Fortryd; arrived, Tjek ud.
// Choosing a station happens with + in "Påvirkede stationer". Colours, words,
// symbols, spacing and radius come from Theme.tsx.
export function StewardStatusControl({
  own,
  coverage,
  blockedReason,
  sending,
  error,
  onArrive,
  onCancel,
  onCheckOut,
}: {
  own: OwnStatus | null;
  coverage: StationCoverage | null;
  // Why the status cannot be changed right now, e.g. the saved offline copy.
  blockedReason: string | null;
  sending: boolean;
  error: string | null;
  onArrive: () => void;
  onCancel: () => void;
  onCheckOut: () => void;
}) {
  const pending = stewardStatus.PENDING;
  const manned = stewardStatus.MANNED;
  // After checking out the steward is free again, like with no status.
  const active = own !== null && own.status !== "CHECKED_OUT" ? own : null;
  const disabled = blockedReason !== null || sending;

  return (
    <View style={styles.container}>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      {blockedReason && (
        <Text style={styles.blocked} accessibilityRole="alert">
          {blockedReason}
        </Text>
      )}

      {active === null && (
        <View style={styles.noStatus}>
          <Text style={styles.heading}>Ingen status</Text>
          {own?.status === "CHECKED_OUT" && (
            <Text style={styles.body}>Du er tjekket ud fra {own.station}.</Text>
          )}
          <Text style={styles.body}>
            Tryk + ved en station under Påvirkede stationer for at melde dig på
            vej.
          </Text>
        </View>
      )}

      {active?.status === "PENDING" && (
        <View style={[styles.banner, { backgroundColor: colors.statusYellow }]}>
          <Text style={styles.bannerTitle} accessibilityRole="header">
            DU ER {pending?.label.toUpperCase()}
          </Text>
          <Text style={styles.body}>
            Du er registreret som {pending?.label.toLowerCase()} til{" "}
            {active.station}.
          </Text>
        </View>
      )}

      {active?.status === "MANNED" && (
        <View style={[styles.banner, { backgroundColor: colors.statusGreen }]}>
          <Text
            style={[styles.bannerTitle, styles.inverse]}
            accessibilityRole="header"
          >
            {manned?.symbol ? `${manned.symbol} ` : ""}DU ER{" "}
            {manned?.label.toUpperCase()}
          </Text>
          <Text style={[styles.body, styles.inverse]}>
            Du er tjekket ind på {active.station}.
          </Text>
        </View>
      )}

      {active !== null && (
        <View style={styles.stationCard}>
          <Text style={styles.caption}>STATION</Text>
          <Text style={styles.stationName}>{active.station}</Text>
          <View style={styles.statusLine}>
            <Text style={styles.caption}>STATUS</Text>
            <Text
              style={[
                styles.chip,
                {
                  backgroundColor:
                    active.status === "MANNED"
                      ? colors.statusGreen
                      : colors.statusYellow,
                  color:
                    active.status === "MANNED"
                      ? colors.textInverse
                      : colors.text,
                },
              ]}
            >
              {(
                stewardStatus[active.status]?.label ?? "Ingen status"
              ).toUpperCase()}
            </Text>
          </View>
          {coverage && coverage.needed > 0 && (
            <>
              <Text style={styles.coverage}>
                {coverage.arrived} af {coverage.needed} ankommet
                {coverage.enRoute > 0 ? ` · ${coverage.enRoute} på vej` : ""}
              </Text>
              <View style={styles.bars}>
                {Array.from({ length: coverage.needed }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      i < coverage.arrived && {
                        backgroundColor: colors.statusGreen,
                      },
                      i >= coverage.arrived &&
                        i < coverage.arrived + coverage.enRoute && {
                          backgroundColor: colors.statusYellow,
                        },
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {active?.status === "PENDING" && blockedReason === null && (
        <Text style={styles.hint}>
          Forkert station? Tryk + ved den rigtige, eller fortryd.
        </Text>
      )}
      {active?.status === "MANNED" && blockedReason === null && (
        <Text style={styles.hint}>
          Tjek ud, når du forlader stationen. Så kan du melde dig til en ny.
        </Text>
      )}

      {active?.status === "PENDING" && (
        <>
          <SlideToConfirm
            label="GODKEND ANKOMST"
            color={colors.statusGreen}
            disabled={disabled}
            onConfirm={onArrive}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onCancel}
            style={[styles.secondaryButton, disabled && styles.disabled]}
          >
            <Text style={styles.secondaryText}>FORTRYD</Text>
          </Pressable>
        </>
      )}

      {active?.status === "MANNED" && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onCheckOut}
          style={[styles.primaryButton, disabled && styles.disabled]}
        >
          <Text style={styles.primaryText}>TJEK UD</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.medium,
  },
  error: {
    ...text.body,
    color: colors.statusRed,
    fontWeight: "600",
    marginBottom: spacing.small,
  },
  blocked: {
    ...text.body,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.small,
  },
  hint: {
    ...text.body,
    color: colors.text,
    marginTop: spacing.small,
  },
  noStatus: {
    ...surface,
    ...box,
    padding: spacing.medium,
  },
  heading: {
    ...text.header,
    color: colors.text,
    marginBottom: spacing.small,
  },
  body: {
    ...text.body,
    color: colors.text,
  },
  inverse: {
    color: colors.textInverse,
  },
  banner: {
    borderRadius: panelRadius,
    marginBottom: spacing.small,
    padding: spacing.large,
  },
  // Larger than text.title on purpose: the status has to be readable at a
  // glance while walking, as in the design group's sketch.
  bannerTitle: {
    ...text.title,
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.small,
  },
  stationCard: {
    backgroundColor: colors.active,
    borderRadius: panelRadius,
    padding: spacing.large,
  },
  caption: {
    ...text.label,
    color: colors.textInverse,
    opacity: 0.7,
  },
  stationName: {
    ...text.title,
    color: colors.textInverse,
    fontSize: 22,
    marginBottom: spacing.medium,
  },
  statusLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.medium,
  },
  chip: {
    borderRadius: panelRadius,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
  },
  coverage: {
    color: colors.textInverse,
    fontWeight: "700",
    marginBottom: spacing.small,
  },
  bars: {
    flexDirection: "row",
    gap: spacing.small,
  },
  bar: {
    backgroundColor: colors.subtleBorder,
    borderRadius: 2,
    flex: 1,
    height: 6,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.active,
    borderRadius: panelRadius,
    marginTop: spacing.medium,
    padding: spacing.large,
  },
  primaryText: {
    ...text.button,
    letterSpacing: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: panelRadius,
    borderWidth: 2,
    marginTop: spacing.medium,
    padding: spacing.medium,
  },
  secondaryText: {
    ...text.button,
    color: colors.text,
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.4,
  },
});
