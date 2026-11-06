import type { ScenarioState } from "../../shared/types/v1/scenario-state.js";
import type { ReportEvent } from "./position-report-repository.js";

export type Deployment = ScenarioState["deployments"][number];
// A stored report as the deployments see it: task done counts as its own step.
export type DeploymentReport = {
  staff: string;
  station: string;
  step: ReportEvent | "TASK_DONE";
  reportedAt: string;
};

const STATUS = {
  EN_ROUTE: "PENDING",
  ARRIVED: "MANNED",
  TASK_DONE: "TASK_DONE",
  CHECKED_OUT: "CHECKED_OUT",
} as const;

function free(station: string): Deployment {
  return {
    status: "UNMANNED",
    staff: null,
    reportedAt: null,
    arrivedAt: null,
    fulfills: station,
  };
}

// The deployments after one accepted report (MET-A-015, contract 7.1.0). Going
// on the way to another station frees the one the steward was on the way to; a
// checked-out deployment keeps its staff, so the control room sees who was
// there. A steward takes their own deployment at the station, or a free or
// checked-out one, or gets an extra one when every deployment there is taken.
export function applyReport(
  deployments: Deployment[],
  report: DeploymentReport,
): Deployment[] {
  const { staff, station, step, reportedAt } = report;
  const next = deployments.map((d) =>
    d.staff === staff && d.fulfills !== station && d.status !== "CHECKED_OUT"
      ? free(d.fulfills)
      : d,
  );
  const own = next.findIndex(
    (d) => d.fulfills === station && d.staff === staff,
  );
  const current = own === -1 ? undefined : next[own];

  if (step === "CANCELLED") {
    if (own !== -1) next[own] = free(station);
    return next;
  }
  // On the way again while there changes nothing (reports from before 7.1.0).
  if (step === "EN_ROUTE" && current && current.status !== "CHECKED_OUT") {
    return next;
  }

  const deployment: Deployment = {
    status: STATUS[step],
    staff,
    fulfills: station,
    reportedAt,
    arrivedAt:
      step === "ARRIVED"
        ? reportedAt
        : step === "EN_ROUTE"
          ? null
          : (current?.arrivedAt ?? (step === "TASK_DONE" ? reportedAt : null)),
  };
  const slot =
    own !== -1
      ? own
      : next.findIndex(
          (d) =>
            d.fulfills === station && (!d.staff || d.status === "CHECKED_OUT"),
        );
  if (slot === -1) next.push(deployment);
  else next[slot] = deployment;
  return next;
}

// The deployments of an activation: its required ones, filled in by the
// accepted reports in the order they arrived. Reports for a station outside the
// activation are ignored. A freed extra deployment is dropped, so a station
// keeps only as many free ones as it requires.
export function deploymentsFromReports(
  required: Deployment[],
  reports: DeploymentReport[],
): Deployment[] {
  const stations = new Set(required.map((d) => d.fulfills));
  const filled = reports
    .filter((r) => stations.has(r.station))
    .reduce(applyReport, required);
  const freeAllowed = new Map<string, number>();
  for (const d of required) {
    freeAllowed.set(d.fulfills, (freeAllowed.get(d.fulfills) ?? 0) + 1);
  }
  for (const d of filled) {
    if (d.staff)
      freeAllowed.set(d.fulfills, (freeAllowed.get(d.fulfills) ?? 0) - 1);
  }
  return filled.filter((d) => {
    if (d.staff) return true;
    const left = freeAllowed.get(d.fulfills) ?? 0;
    freeAllowed.set(d.fulfills, left - 1);
    return left > 0;
  });
}
