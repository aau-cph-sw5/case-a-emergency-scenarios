import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";
import type { OwnStatus } from "../data/steward-status";
import { animateNextLayout } from "../motion";
import { CardButton } from "./CardButton";
import { SlideToConfirm } from "./SlideToConfirm";
import { StatusBox, type CardLook, type StatusChip } from "./StatusBox";
import { Swap } from "./Swap";

export type StationCoverage = {
  arrived: number;
  enRoute: number;
  needed: number;
};

// The gap between the boxes inside the status card and around them.
const INSIDE = spacing.small * 2;

// The steward's own status in the active scenario (MET-A-015, #263, #305):
// no status, on the way, arrived or checked out (#376).
//
// ONE status card holds what the steward acts on: the status (StatusBox),
// the map and the ONE control for the next valid action. Without a station,
// the yellow BEKRÆFT slide for the station chosen in the list (grey and
// locked until one is chosen); on the way, the CHECK IND slide with a cross
// that cancels; arrived, TJEK UD. The card's colour is the status: black
// without a station, yellow on the way, green once arrived. A new status
// turns the whole card over (Swap). children (the station list) sit under
// the card. Colours, words, spacing and radius come from Theme.tsx.
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
  onCancel,
  cancelDisabled = false,
  offline = false,
  ready = true,
  scenario,
  connected = true,
  map,
  note,
  children,
}: {
  own: OwnStatus | null;
  // The staffing shown as a bar under the name: of the own station, or
  // without one of the station chosen in the list. Without either, the card
  // asks the steward to choose the nearest station instead.
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
  // Cancels the assignment while on the way.
  onCancel?: () => void;
  cancelDisabled?: boolean;
  // Showing the saved copy without a connection: the slide is grey and locked.
  offline?: boolean;
  // False until the steward's own status has been read (see StatusBox).
  ready?: boolean;
  scenario?: string;
  connected?: boolean;
  // The map of the affected stretch, shown in the card under the status.
  map?: ReactNode;
  // A note above the list (how the last position report went). It is not
  // part of the list, so it shows at once, also while the card turns.
  note?: ReactNode;
  children?: ReactNode;
}) {
  // After checking out the steward is free again, like with no status.
  const active = own !== null && own.status !== "CHECKED_OUT" ? own : null;
  const disabled = blockedReason !== null || sending;
  // Arrived and task done are both at the station: the steward checks out
  // from either (#310).
  const atStation =
    active?.status === "MANNED" || active?.status === "TASK_DONE";
  const onTheWay = active?.status === "PENDING";
  // Whether the cross next to CHECK IND has been pressed and the red
  // BEKRÆFT ANNULLÉR slide is showing. It starts over on every new status.
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!onTheWay && confirmCancel) setConfirmCancel(false);
  // Whether TJEK UD has been pressed and the red BEKRÆFT TJEK UD slide is
  // showing. It starts over each time the steward is at a station again.
  const [confirmOut, setConfirmOut] = useState(false);
  if (!atStation && confirmOut) setConfirmOut(false);

  // What the bottom control is. Empty until the steward's status is read, so
  // no control shows that is not the steward's.
  const bottomKind = !ready
    ? ""
    : atStation
      ? confirmOut
        ? "confirm-check-out"
        : "check-out"
      : onTheWay && confirmCancel
        ? "confirm-cancel"
        : "slide";
  // The slide: BEKRÆFT without a station, CHECK IND on the way.
  const slide: "assign" | "check-in" | null = onTheWay
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

  const look: CardLook = atStation
    ? steward.card.arrived
    : onTheWay
      ? steward.card.onTheWay
      : steward.card.none;
  // A new station or status turns the card; nothing turns before the status
  // has been read.
  const turnKey = ready
    ? `${active?.station ?? ""}|${active?.status ?? ""}`
    : "";

  // The list under the card changes together with the card: while the card
  // turns, the list stays as it was, and it takes the new status in the
  // moment the card shows its new face (onSwap gives the status it shows).
  // Before, the list changed at once and the card only half a turn later.
  // Changes that are not a new status (a count, a chosen row) show at once.
  const [cardKey, setCardKey] = useState(turnKey);
  // The first status shows at once, like on the card.
  if (cardKey === "" && turnKey !== "") setCardKey(turnKey);
  const holding = cardKey !== turnKey;
  // The list as it was while the card shows the same status as the list.
  const [heldList, setHeldList] = useState(children);
  if (!holding && heldList !== children) setHeldList(children);
  const showNewList = (shownKey: string) => {
    // The rows that change size with the status (the own row, the tasks
    // after check in) ease to their new place instead of jumping.
    animateNextLayout();
    setCardKey(shownKey);
  };

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

      {/* A new status turns the whole card (Swap, "turn"). */}
      <Swap swapKey={turnKey} motion="turn" onSwap={showNewList}>
        <View
          style={[styles.card, { backgroundColor: look.background }]}
          testID="status-card"
        >
          <StatusBox
            // After checking out the card is back at the start (#376): no
            // station chosen.
            station={active?.station ?? "Ingen station"}
            chip={statusChip(active)}
            subLine={active === null ? "Vælg den nærmeste station" : null}
            staffing={coverage}
            scenario={scenario}
            connected={connected}
            look={look}
            ready={ready}
          />
          {map !== undefined && <View style={styles.map}>{map}</View>}

          {/* The ONE control. Its kind changes by the shared axis (Swap);
              the slide changes its action the same way inside itself. */}
          <View style={styles.slot}>
            <Swap swapKey={bottomKind}>
              {/* Keeps the place of the control while the status is read. */}
              {!ready && <View style={styles.placeholder} />}
              {/* ONE slide in one place: from BEKRÆFT to CHECK IND it is the
                  same element, held at the end while the change is sent. On
                  the way, its cross cancels in two steps, like checking out:
                  the cross, then the red slide. */}
              {bottomKind === "slide" && slide !== null && (
                <SlideToConfirm
                  label={slide === "check-in" ? "CHECK IND" : "BEKRÆFT"}
                  tone={slide === "check-in" ? "green" : "yellow"}
                  lockedReason={slideLock}
                  disabled={slide === "check-in" ? disabled : sending}
                  pending={sending}
                  actionKey={slide}
                  cross={
                    slide === "check-in" && onCancel !== undefined
                      ? {
                          label: "Annullér tildeling",
                          onPress: () => setConfirmCancel(true),
                        }
                      : undefined
                  }
                  onConfirm={
                    slide === "check-in" ? onArrive : (onAssign ?? noop)
                  }
                />
              )}
              {bottomKind === "confirm-cancel" && (
                <SlideToConfirm
                  label="BEKRÆFT ANNULLÉR"
                  tone="red"
                  lockedReason={offline ? "Ingen forbindelse" : null}
                  disabled={cancelDisabled}
                  pending={sending}
                  cross={{
                    label: "Fortryd annullering",
                    onPress: () => setConfirmCancel(false),
                  }}
                  onConfirm={onCancel ?? noop}
                />
              )}
              {/* Checking out takes two steps, like cancelling, so a stray
                  tap cannot check anyone out: TJEK UD, then the red slide
                  with a cross that steps back. No approval from the control
                  room. */}
              {bottomKind === "check-out" && (
                <CardButton
                  kind="wide"
                  label="TJEK UD"
                  disabled={disabled}
                  onPress={() => setConfirmOut(true)}
                />
              )}
              {bottomKind === "confirm-check-out" && (
                <SlideToConfirm
                  label="BEKRÆFT TJEK UD"
                  tone="red"
                  lockedReason={offline ? "Ingen forbindelse" : null}
                  disabled={disabled}
                  pending={sending}
                  cross={{
                    label: "Fortryd tjek ud",
                    onPress: () => setConfirmOut(false),
                  }}
                  onConfirm={onCheckOut}
                />
              )}
            </Swap>
          </View>
        </View>
      </Swap>

      <View style={styles.middle}>
        {note}
        {holding ? heldList : children}
      </View>
    </View>
  );
}

function noop() {}

// The chip in the status box: what the status is, in a word (how many are
// there shows in the staffing bar under the name). Black with yellow on the
// yellow card, white with green on the green card, red when no station is
// chosen.
function statusChip(own: OwnStatus | null): StatusChip {
  switch (own?.status) {
    case "PENDING":
      return {
        label: "PÅ VEJ",
        background: steward.black,
        color: steward.yellow,
      };
    case "MANNED":
    case "TASK_DONE":
      return {
        label: "ANKOMMET",
        background: colors.background,
        color: steward.green,
      };
    default:
      return {
        label: "IKKE VALGT",
        background: steward.red,
        color: colors.textInverse,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: INSIDE,
  },
  card: {
    borderRadius: panelRadius,
  },
  map: {
    aspectRatio: 21 / 9,
    backgroundColor: colors.background,
    borderRadius: panelRadius,
    marginHorizontal: INSIDE,
    overflow: "hidden",
  },
  slot: {
    margin: INSIDE,
  },
  middle: {
    flex: 1,
  },
  error: {
    ...text.body,
    color: colors.statusRed,
    fontWeight: "600",
  },
  blocked: {
    ...text.body,
    color: colors.text,
    fontWeight: "600",
  },
  placeholder: {
    height: steward.slideHeight,
  },
});
