import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";
import type { OwnStatus } from "../data/steward-status";
import { AxisSwap } from "./AxisSwap";
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
  ready = true,
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
  // False until the steward's own status has been read (see StatusBox).
  ready?: boolean;
  children?: ReactNode;
}) {
  // After checking out the steward is free again, like with no status.
  const active = own !== null && own.status !== "CHECKED_OUT" ? own : null;
  const disabled = blockedReason !== null || sending;
  // Arrived and task done are both at the station: the steward checks out
  // from either (#310).
  const atStation =
    active?.status === "MANNED" || active?.status === "TASK_DONE";
  // Whether TJEK UD has been pressed and the red slide is showing. It starts
  // over each time the steward is at a station again.
  const [confirmOut, setConfirmOut] = useState(false);
  if (!atStation && confirmOut) setConfirmOut(false);

  // What the bottom control is: the slide, the TJEK UD button or nothing.
  // Empty until the steward's status is read, so no control shows that is
  // not the steward's (BEKRÆFT for a steward who is on the way).
  const bottomKind = !ready
    ? ""
    : atStation
      ? confirmOut
        ? "confirm-check-out"
        : "check-out"
      : "slide";
  // The slide at the bottom: BEKRÆFT without a station, CHECK IND on the way.
  const slide: "assign" | "check-in" | null =
    active?.status === "PENDING"
      ? "check-in"
      : active === null && onAssign !== undefined
        ? "assign"
        : null;
  // Grey and locked only when it is really blocked.
  const slideLock =
    slide === "check-in"
      ? offline
        ? "Ingen forbindelse"
        : blockedReason !== null
          ? "Din position sendes"
          : null
      : selected === undefined
        ? "Vælg en station"
        : null;

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
        // After checking out the box is back at the start (#376): no station
        // chosen. "Du er checket ud" shows only as the 4 s note.
        station={active?.station ?? "Ingen station"}
        chip={statusChip(active, coverage)}
        subLine={
          active === null
            ? "Vælg den nærmeste station"
            : coverage && coverage.needed > 0
              ? staffingWords(coverage.arrived, coverage.enRoute)
              : null
        }
        note={note}
        ready={ready}
      />

      <View style={styles.middle}>{children}</View>

      {/* The ONE control at the bottom. Its kind changes with a shared-axis
          change (AxisSwap), and the slide changes its action the same way
          inside (SlideToConfirm), so nothing at the bottom is ever just
          replaced. */}
      <AxisSwap swapKey={bottomKind}>
        {/* Keeps the place of the control while the status is read. */}
        {!ready && <View style={styles.placeholder} />}
        {/* ONE slide in one place (#376): from BEKRÆFT to CHECK IND it is the
          same element, held at the end with a spinner while the change is
          sent; its frame stays and its content changes to the next action
          with a shared-axis move (see SlideToConfirm). */}
        {ready && slide !== null && (
          <View>
            <SlideToConfirm
              label={slide === "check-in" ? "CHECK IND" : "BEKRÆFT"}
              tone={slide === "check-in" ? "green" : "yellow"}
              lockedReason={slideLock}
              disabled={slide === "check-in" ? disabled : sending}
              pending={sending}
              actionKey={slide ?? undefined}
              onConfirm={slide === "check-in" ? onArrive : (onAssign ?? noop)}
              onSlidingChange={onSlidingChange}
            />
          </View>
        )}

        {/* Checking out takes two steps (#377), so a stray tap cannot check
            anyone out: TJEK UD is replaced (the same shared-axis change) by
            the red BEKRÆFT TJEK UD slide, and the cross steps back. No
            approval from the control room. */}
        {ready && atStation && !confirmOut && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setConfirmOut(true)}
            style={[styles.primaryButton, disabled && styles.disabled]}
          >
            <Text style={styles.primaryText}>TJEK UD</Text>
          </Pressable>
        )}
        {ready && atStation && confirmOut && (
          <View style={styles.confirmRow}>
            <View style={styles.grow}>
              <SlideToConfirm
                label="BEKRÆFT TJEK UD"
                tone="red"
                lockedReason={offline ? "Ingen forbindelse" : null}
                disabled={disabled}
                pending={sending}
                onConfirm={onCheckOut}
                onSlidingChange={onSlidingChange}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fortryd tjek ud"
              onPress={() => setConfirmOut(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        )}
      </AxisSwap>
    </View>
  );
}

function noop() {}

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
  placeholder: {
    height: steward.slideHeight,
    marginTop: spacing.medium,
  },
  confirmRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.small * 2,
  },
  grow: {
    flex: 1,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: steward.strip,
    borderRadius: panelRadius,
    height: steward.slideHeight,
    justifyContent: "center",
    width: steward.slideHeight,
  },
  closeText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
});
