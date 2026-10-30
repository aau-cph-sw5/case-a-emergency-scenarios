// No react-native imports here, so the stub, the server and the unit tests can
// import this file.
// The status changes the contract allows (MET-A-015). steward-status.schema.json
// describes the same rules; keep the two in step.
import type { StewardStatusValue } from "../types/v1/steward-status.js";

export type { StewardStatusValue };

type Current = { status: StewardStatusValue; station: string } | null;
type Next = { status: StewardStatusValue; station: string };

// CHANGE: allowed, and the status changes.
// REPEAT: the steward already has this status at this station (a double tap);
// answered with the current status, and nothing changes.
// INVALID: rejected with E1006, and nothing changes.
export type StatusChange = "CHANGE" | "REPEAT" | "INVALID";

export function classifyStatusChange(
  current: Current,
  next: Next,
): StatusChange {
  if (
    current !== null &&
    current.status === next.status &&
    current.station === next.station
  ) {
    return "REPEAT";
  }

  const sameStation = current !== null && current.station === next.station;

  switch (next.status) {
    case "ASSIGNED":
      // Assign, change station before arriving, or take a new station after
      // checking out.
      return current === null ||
        current.status === "ASSIGNED" ||
        current.status === "CHECKED_OUT"
        ? "CHANGE"
        : "INVALID";
    case "CHECKED_IN":
      return current?.status === "ASSIGNED" && sameStation
        ? "CHANGE"
        : "INVALID";
    case "CHECKED_OUT":
      // Check out, or cancel the assignment without arriving.
      return (current?.status === "CHECKED_IN" ||
        current?.status === "ASSIGNED") &&
        sameStation
        ? "CHANGE"
        : "INVALID";
  }
}
