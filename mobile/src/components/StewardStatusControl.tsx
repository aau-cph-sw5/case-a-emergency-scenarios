import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";
import type { OwnStatus } from "../data/steward-status";
import { SlideToConfirm } from "./SlideToConfirm";
import { StatusBox, type StatusChip, type StatusNote } from "./StatusBox";

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
//
// The status is shown in the black status box (#375): the station, a chip
// with the status, and the staffing of the station under its name. note is
// the message that turns the box over after the steward's own change.
export function StewardStatusControl({
  own,
  coverage,
  blockedReason,
  sending,
  error,
  onArrive,
  onCancel,
  onCheckOut,
  onSlidingChange,
  note = null,
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
  // Whether the arrival slide is being slid, so the screen can stop scrolling.
  onSlidingChange?: (sliding: boolean) => void;
  note?: StatusNote | null;
}) {
  // After checking out the steward is free again, like with no status.
  const active = own !== null && own.status !== "CHECKED_OUT" ? own : null;
  const disabled = blockedReason !== null || sending;
  // Arrived and task done are both at the station: the steward checks out
  // from either (#310).
  const atStation =
    active?.status === "MANNED" || active?.status === "TASK_DONE";

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

      <StatusBox
        station={
          active?.station ??
          (own?.status === "CHECKED_OUT" ? own.station : "Ingen station")
        }
        chip={statusChip(own, coverage)}
        subLine={
          own?.status === "CHECKED_OUT"
            ? `Du er tjekket ud fra ${own.station}.`
            : active === null
              ? "Vælg den nærmeste station"
              : staffing(coverage)
        }
        note={note}
      />

      {active === null && (
        <Text style={styles.hint}>
          Tryk + ved en station under Påvirkede stationer for at melde dig på
          vej.
        </Text>
      )}

      {active?.status === "PENDING" && blockedReason === null && (
        <Text style={styles.hint}>
          Forkert station? Tryk + ved den rigtige, eller fortryd.
        </Text>
      )}
      {atStation && blockedReason === null && (
        <Text style={styles.hint}>
          Tjek ud, når du forlader stationen. Så kan du melde dig til en ny.
        </Text>
      )}

      {active?.status === "PENDING" && (
        <>
          <SlideToConfirm
            label="CHECK IND"
            color={steward.green}
            disabled={disabled}
            onConfirm={onArrive}
            onSlidingChange={onSlidingChange}
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

      {atStation && (
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

// The chip in the status box: what the status is, in the colour of the slide
// that led to it.
function statusChip(
  own: OwnStatus | null,
  coverage: StationCoverage | null,
): StatusChip {
  switch (own?.status) {
    case "PENDING":
      return {
        label: "PÅ VEJ",
        background: steward.yellow,
        color: colors.text,
      };
    case "MANNED":
    case "TASK_DONE":
      return {
        label: coverage
          ? `ANKOMMET ${coverage.arrived}/${coverage.needed}`
          : "ANKOMMET",
        background: steward.green,
        color: colors.textInverse,
      };
    case "CHECKED_OUT":
      return {
        label: "CHECKET UD",
        background: steward.red,
        color: colors.textInverse,
      };
    default:
      return {
        label: "IKKE VALGT",
        background: steward.chipGrey,
        color: colors.text,
      };
  }
}

// The line under the station name: how many are at the station and on the
// way, the same words as the station list. Nothing when the app has no count.
function staffing(coverage: StationCoverage | null): string | null {
  if (coverage === null || coverage.needed === 0) return null;
  const parts = [
    coverage.arrived > 0 ? `${coverage.arrived} på stationen` : null,
    coverage.enRoute > 0 ? `${coverage.enRoute} på vej` : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Ingen tildelt";
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
  primaryButton: {
    alignItems: "center",
    backgroundColor: steward.black,
    borderRadius: panelRadius,
    justifyContent: "center",
    marginTop: spacing.medium,
    minHeight: steward.slideHeight,
  },
  primaryText: {
    ...text.button,
    letterSpacing: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: steward.strip,
    borderRadius: panelRadius,
    justifyContent: "center",
    marginTop: spacing.medium,
    minHeight: 44,
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
