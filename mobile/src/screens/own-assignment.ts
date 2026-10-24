import type { Deployment } from "../../../shared/scenario/active-scenario";

// The logged-in steward's own deployment in the active scenario, or undefined
// when the steward has none. deployments[].staff holds the userId of the
// steward who reported to the station, written as text (contract 3.1.1), the
// same way the server stores staff for position reports. Since #193 the
// userId is a numeric database id, so both sides are compared as text: 1 and
// "1" are the same steward. The id comes from the offline copy, so this also
// works without network.
export function findOwnAssignment(
  deployments: Deployment[],
  userId: string | number | null | undefined,
): Deployment | undefined {
  if (userId === null || userId === undefined || userId === "") {
    return undefined;
  }
  const id = String(userId);
  return deployments.find(
    (deployment) =>
      deployment.staff !== null &&
      deployment.staff !== undefined &&
      String(deployment.staff) === id,
  );
}
