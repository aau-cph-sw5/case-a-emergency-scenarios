import type { Deployment } from "../../../shared/scenario/active-scenario";

// The logged-in steward's own deployment in the active scenario, or undefined
// when the steward has none. deployments[].staff holds the userId of the
// assigned steward (contract 3.1.1), the same id the login token carries and
// the offline copy keeps, so this also works without network.
export function findOwnAssignment(
  deployments: Deployment[],
  userId: string | null | undefined,
): Deployment | undefined {
  if (!userId) return undefined;
  return deployments.find((deployment) => deployment.staff === userId);
}
