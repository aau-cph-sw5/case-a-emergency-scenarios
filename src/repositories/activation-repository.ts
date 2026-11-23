import { getDatabase, type Db } from "../db/client.js";
import {
  deploymentsFromReports,
  type Deployment,
  type DeploymentReport,
} from "./deployment-status.js";
import type { LineGroup } from "../../shared/auth/line-groups.js";

export const ACTIVATION_STATUSES = ["ACTIVE", "CLOSED"] as const;
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];

export type StoredActivation = {
  activationId: number;
  scenarioId: string;
  lineGroup: LineGroup;
  startedAt: string;
  endedAt: string | null;
  status: ActivationStatus;
  actor: string;
  sequence: number;
  deployments: Deployment[];
};

export async function lockActivationLifecycle(db: Db): Promise<void> {
  await db`SELECT pg_advisory_xact_lock(4812421, 1)`;
}

export async function listActivations(
  status?: ActivationStatus,
  db: Db = getDatabase(),
  id?: number,
): Promise<StoredActivation[]> {
  const rows = await db<
    {
      id: number;
      scenarioId: string;
      lineGroup: LineGroup;
      activatedAt: Date;
      deactivatedAt: Date | null;
      actor: string;
      sequence: string;
      deployments: Deployment[];
    }[]
  >`
    SELECT a.id, a.scenario_id, a.line_group, a.activated_at, a.deactivated_at,
      u.username AS actor, e.sequence,
      COALESCE((SELECT json_agg(json_build_object(
        'status', 'UNMANNED', 'staff', NULL, 'fulfills', st.code
      ) ORDER BY r.id)
      FROM station_requirements r JOIN stations st ON st.id = r.station_id
      WHERE r.scenario_version_id = a.scenario_version_id), '[]'::json) AS deployments
    FROM incident_activations a
    JOIN users u ON u.id = a.activated_by
    JOIN incident_events e ON e.activation_id = a.id::text
      AND e.type = 'SCENARIO_ACTIVATED'
    WHERE (${id ?? null}::integer IS NULL OR a.id = ${id ?? null}::integer)
      AND (${status ?? null}::text IS NULL
      OR (${status ?? null} = 'ACTIVE' AND a.deactivated_at IS NULL)
      OR (${status ?? null} = 'CLOSED' AND a.deactivated_at IS NOT NULL))
    ORDER BY a.id
  `;
  const reports = await reportsDuring(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    activationId: row.id,
    scenarioId: row.scenarioId,
    lineGroup: row.lineGroup,
    startedAt: row.activatedAt.toISOString(),
    endedAt: row.deactivatedAt?.toISOString() ?? null,
    status: row.deactivatedAt ? "CLOSED" : "ACTIVE",
    actor: row.actor,
    sequence: Number(row.sequence),
    // Derived from the stored reports, so they survive a restart (MET-A-015).
    deployments: deploymentsFromReports(
      row.deployments,
      reports.get(row.id) ?? [],
    ),
  }));
}

// The accepted position reports received while each activation was active,
// oldest first.
async function reportsDuring(
  db: Db,
  ids: number[],
): Promise<Map<number, DeploymentReport[]>> {
  const byActivation = new Map<number, DeploymentReport[]>();
  if (ids.length === 0) return byActivation;
  const rows = await db<
    {
      activationId: number;
      staff: string;
      station: string;
      event: DeploymentReport["step"];
      taskDone: boolean;
      reportedAt: Date;
    }[]
  >`
    SELECT a.id AS activation_id, p.staff, p.station, p.event, p.task_done,
      p.reported_at
    FROM incident_activations a
    JOIN position_reports p ON p.activation_id = a.id
    WHERE a.id IN ${db(ids)}
    ORDER BY p.received_at, p.id
  `;
  for (const row of rows) {
    const list = byActivation.get(row.activationId) ?? [];
    list.push({
      staff: row.staff,
      station: row.station,
      step: row.taskDone ? "TASK_DONE" : row.event,
      reportedAt: row.reportedAt.toISOString(),
    });
    byActivation.set(row.activationId, list);
  }
  return byActivation;
}

export async function findActivation(
  id: number,
  db: Db = getDatabase(),
): Promise<StoredActivation | undefined> {
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) return undefined;
  return (await listActivations(undefined, db, id))[0];
}

// The scenario shown for an activation must use the version captured at activation.
export async function findActiveScenarioVersion(
  id: number,
  scenarioId: string,
): Promise<number | undefined> {
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) return undefined;
  const [row] = await getDatabase()<{ scenarioVersionId: number }[]>`
    SELECT scenario_version_id FROM incident_activations
    WHERE id = ${id} AND scenario_id = ${scenarioId} AND deactivated_at IS NULL
  `;
  return row?.scenarioVersionId;
}

export async function createActivation(
  db: Db,
  scenarioId: string,
  version: string,
  userId: number,
): Promise<number> {
  const [row] = await db<{ id: number }[]>`
    INSERT INTO incident_activations (scenario_id, scenario_version_id, line_group, activated_by, activated_at)
    SELECT s.scenario_id, v.id, s.line_group, ${userId}, clock_timestamp()
    FROM scenarios s JOIN scenario_versions v ON v.scenario_id = s.scenario_id
    WHERE s.scenario_id = ${scenarioId} AND v.version = ${version}
    RETURNING id
  `;
  if (!row)
    throw new Error(
      `Scenario ${scenarioId} version ${version} no longer exists`,
    );
  return row.id;
}

export async function closeActivation(db: Db, id: number): Promise<void> {
  await db`
    UPDATE incident_activations SET deactivated_at = clock_timestamp()
    WHERE id = ${id} AND deactivated_at IS NULL
  `;
}

export async function findActiveActivation(
  lineGroup: LineGroup,
  db: Db = getDatabase(),
): Promise<StoredActivation | undefined> {
  return (await listActivations("ACTIVE", db)).find(
    (activation) => activation.lineGroup === lineGroup,
  );
}
