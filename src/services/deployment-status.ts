import type { ScenarioState } from "../../shared/types/v1/scenario-state.js";

export type Deployment = ScenarioState["deployments"][number];
type ReportedStatus = "PENDING" | "MANNED" | "TASK_DONE";

const ORDER: Deployment["status"][] = [
  "UNMANNED",
  "PENDING",
  "MANNED",
  "TASK_DONE",
];

// The steward's deployments after an accepted position report (MET-A-015).
// The steward leaves any other station: their deployment there is removed, or
// reset to UNMANNED when it is the station's only one. At the reported station
// they take their own deployment or a free one, or get a new one when every
// deployment there is taken. At the same station the status only moves
// forward, so reporting the station again after arriving keeps MANNED.
export function applyPositionReport(
  deployments: Deployment[],
  staff: string,
  station: string,
  reported: ReportedStatus,
  now: string,
): Deployment[] {
  const next = deployments
    .filter(
      (d) =>
        d.staff !== staff ||
        d.fulfills === station ||
        deployments.filter((other) => other.fulfills === d.fulfills).length ===
          1,
    )
    .map((d) =>
      d.staff === staff && d.fulfills !== station
        ? {
            status: "UNMANNED" as const,
            staff: null,
            reportedAt: null,
            arrivedAt: null,
            fulfills: d.fulfills,
          }
        : d,
    );

  const own = next.findIndex(
    (d) => d.fulfills === station && d.staff === staff,
  );
  const slot =
    own !== -1
      ? own
      : next.findIndex((d) => d.fulfills === station && !d.staff);
  const current = own !== -1 ? next[own] : undefined;
  const status =
    current && ORDER.indexOf(current.status) > ORDER.indexOf(reported)
      ? current.status
      : reported;
  const deployment: Deployment = {
    status,
    staff,
    fulfills: station,
    reportedAt: now,
    arrivedAt: status === "PENDING" ? null : (current?.arrivedAt ?? now),
  };

  if (slot === -1) next.push(deployment);
  else next[slot] = deployment;
  return next;
}
