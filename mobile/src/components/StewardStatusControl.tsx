import type { ReactNode } from "react";
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
import {
  StatusBox,
  staffingWords,
  type StatusChip,
  type StatusNote,
} from "./StatusBox";

export type StationCoverage = {
  arrived: number;
  enRoute: number;
  needed: number;
};

// The steward's own status in the active scenario (MET-A-015, #263, #305):
// no status, on the way, arrived or checked out. Only the next valid action
// is offered, in ONE control at the bottom of the screen (#376): without a
// station, the yellow BEKRÆFT slide for the station chosen in the list (grey
// and locked until one is chosen); on the way, the CHECK IND slide; arrived,
// Tjek ud. Cancelling is a swipe on the own row in the list. children (the
// map and the list) sit between the status box and the control. Colours,
// words, symbols, spacing and radius come from Theme.tsx.
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
  onAssign,
  selected,
  onCheckOut,
  onSlidingChange,
  note = null,
  offline = false,
  children,
}: {
  own: OwnStatus | null;
  coverage: StationCoverage | null;
  // Why the status cannot be changed right now, e.g. the saved offline copy.
  blockedReason: string | null;
  sending: boolean;
  error: string | null;
  onArrive: () => void;
  // Assigns the steward to the station chosen in the list. Left out when the
  // steward cannot choose a station right now.
  onAssign?: () => void;
  selected?: string;
  onCheckOut: () => void;
  // Whether the arrival slide is being slid, so the screen can stop scrolling.
  onSlidingChange?: (sliding: boolean) => void;
  note?: StatusNote | null;
  // Showing the saved copy without a connection: the slide is grey and locked.
  offline?: boolean;
  children?: ReactNode;
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
              : coverage && coverage.needed > 0
                ? staffingWords(coverage.arrived, coverage.enRoute)
                : null
        }
        note={note}
      />

      <View style={styles.middle}>{children}</View>

      {active?.status === "PENDING" && (
        <>
          <SlideToConfirm
            label="CHECK IND"
            tone="green"
            lockedReason={offline ? "Ingen forbindelse" : null}
            disabled={disabled}
            onConfirm={onArrive}
            onSlidingChange={onSlidingChange}
          />
        </>
      )}

      {active === null && onAssign && (
        <SlideToConfirm
          label="BEKRÆFT"
          tone="yellow"
          lockedReason={selected === undefined ? "Vælg en station" : null}
          disabled={sending}
          onConfirm={onAssign}
          onSlidingChange={onSlidingChange}
        />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  middle: {
    flex: 1,
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
  disabled: {
    opacity: 0.4,
  },
});
