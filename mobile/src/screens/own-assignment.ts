import type { Deployment } from "../../../shared/scenario/active-scenario";

// The logged-in steward's own deployment in the active scenario, or undefined
// when the steward has none. deployments[].staff holds the userId of the
// steward who reported to the station, written as text (contract 3.1.1), the
// same way the server stores staff for position reports. Since #193 the
// userId is a numeric database id, so both sides are compared as text: 1 and
// "1" are the same steward. The id comes from the offline copy, so this also
// works without network.
//
// A checked-out deployment keeps its staff so the control room can see who was
// there (#289). When the steward has gone on to another station, that newer
// deployment is the one that counts, so one that is not checked out wins.
export function findOwnAssignment(
  deployments: Deployment[],
  userId: string | number | null | undefined,
): Deployment | undefined {
  if (userId === null || userId === undefined || userId === "") {
    return undefined;
  }
  const id = String(userId);
  const own = deployments.filter(
    (deployment) =>
      deployment.staff !== null &&
      deployment.staff !== undefined &&
      String(deployment.staff) === id,
  );
  // The server keeps only the latest checkout, but an older offline copy can
  // still hold several, so the one checked out last (latest reportedAt) wins.
  return (
    own.find((deployment) => deployment.status !== "CHECKED_OUT") ??
    own.reduce<Deployment | undefined>(
      (latest, deployment) =>
        latest === undefined ||
        (deployment.reportedAt ?? "") > (latest.reportedAt ?? "")
          ? deployment
          : latest,
      undefined,
    )
  );
}

// The deployments as the app knows them (#376): the server's copy with the
// steward's OWN status from the app put in its place. After the steward's own
// change the server's copy lags behind for a moment (until the next copy
// arrives), and counting from it showed old numbers that then jumped, for
// example "ANKOMMET 0/1" just after checking in. With this the screen shows
// the right numbers at once, and the next copy from the server changes
// nothing. own is the app's status (null: no station); the station is the
// one the steward is on the way to, at, or checked out from.
export function withOwnStatus(
  deployments: Deployment[],
  userId: string | number | null | undefined,
  own: { station: string; status: Deployment["status"] } | null,
): Deployment[] {
  if (userId === null || userId === undefined || userId === "") {
    return deployments;
  }
  const id = String(userId);
  const others = deployments.filter(
    (deployment) =>
      deployment.staff === null ||
      deployment.staff === undefined ||
      String(deployment.staff) !== id,
  );
  if (own === null) return others;
  const server = findOwnAssignment(deployments, userId);
  if (server?.fulfills === own.station && server.status === own.status) {
    return deployments;
  }
  return [
    ...others,
    {
      status: own.status,
      staff: id,
      fulfills: own.station,
      reportedAt: server?.reportedAt ?? new Date().toISOString(),
      arrivedAt: own.status === "MANNED" ? new Date().toISOString() : null,
    },
  ];
}
