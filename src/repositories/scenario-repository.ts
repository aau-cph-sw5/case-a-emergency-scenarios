import { getDatabase } from "../db/client.js";
import type { Scenario } from "../../shared/types/v1/scenario.js";
import type { ScenarioList } from "../../shared/types/v1/scenario-list.js";

export async function getAllScenarios(): Promise<ScenarioList> {
  const sql = getDatabase();
  return sql<ScenarioList>`
    SELECT
      s.scenario_id AS "scenarioId",
      s.name,
      v.version     AS "currentVersion",
      COALESCE(
        json_agg(json_build_object(
          'trackNumber', t.track_number,
          'stationA',    a.name,
          'stationB',    b.name
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      )             AS covers,
      '[]'::json    AS versions
    FROM scenarios s
    JOIN scenario_versions v ON v.id = s.current_version_id
    LEFT JOIN scenario_covers c ON c.scenario_id = s.scenario_id
    LEFT JOIN track_segments  t ON t.id = c.track_segment_id
    LEFT JOIN stations a ON a.id = t.station_a_id
    LEFT JOIN stations b ON b.id = t.station_b_id
    GROUP BY s.scenario_id, s.name, v.version
    ORDER BY s.name
  `;
}

// Find the current version of a scenario based on it's id.
export async function findScenario(
  scenarioId: string,
): Promise<Scenario | undefined> {
  const sql = getDatabase();

  const [row] = await sql`
    SELECT s.scenario_id, s.name, v.id AS version_id, v.version, v.revision,
           p.name AS plan_name
    FROM scenarios s
    JOIN scenario_versions v ON v.id = s.current_version_id
    JOIN operating_plans p ON p.scenario_version_id = v.id
    WHERE s.scenario_id = ${scenarioId}
  `;
  if (!row) return undefined;

  const [covers, patterns, requirements, passengerInformation] =
    await Promise.all([
      sql`
        SELECT t.track_number, a.code AS station_a, b.code AS station_b
        FROM scenario_covers c
        JOIN track_segments t ON t.id = c.track_segment_id
        JOIN stations a ON a.id = t.station_a_id
        JOIN stations b ON b.id = t.station_b_id
        WHERE c.scenario_id = ${scenarioId}
      `,

      // Each pattern with its stops as a list.
      sql`
        SELECT op.operation_type, op.route_code, op.track_number,
               op.maximum_trains, op.did, op.description,
               (SELECT json_agg(json_build_object('sequence', ls.sequence, 'station', st.code)
                                ORDER BY ls.sequence)
                FROM line_stops ls JOIN stations st ON st.id = ls.station_id
                WHERE ls.operating_pattern_id = op.id) AS route
        FROM operating_patterns op
        JOIN operating_plans p ON p.id = op.operating_plan_id
        WHERE p.scenario_version_id = ${row.versionId}
        ORDER BY op.id
      `,

      // Each station requirement with its staffing windows and actions as lists.
      sql`
        SELECT st.code AS station, r.placement, r.minimum_staffing,
               (SELECT json_agg(json_build_object(
                         'dayPattern', w.day_pattern,
                         'startTime',  to_char(w.start_time, 'HH24:MI'),
                         'endTime',    to_char(w.end_time, 'HH24:MI')))
                FROM staffing_windows w WHERE w.station_requirement_id = r.id) AS active_during,
               (SELECT json_agg(json_build_object('sequence', a.sequence, 'instruction', a.instruction)
                                ORDER BY a.sequence)
                FROM actions a WHERE a.station_requirement_id = r.id) AS actions
        FROM station_requirements r
        JOIN stations st ON st.id = r.station_id
        WHERE r.scenario_version_id = ${row.versionId}
        ORDER BY r.id
      `,

      sql`
        SELECT channel, language, message
        FROM passenger_information
        WHERE scenario_version_id = ${row.versionId}
      `,
    ]);

  return {
    scenarioId: row.scenarioId,
    name: row.name,
    currentVersion: row.version,
    covers,
    versions: [
      {
        version: row.version,
        revision: row.revision,
        operatingPlan: {
          name: row.planName,
          patterns: patterns.map(({ description, route, ...pattern }) => ({
            ...pattern,
            ...(description !== null && { description }),
            route: route ?? [],
          })),
        },
        stationRequirements: requirements.map(({ activeDuring, actions, ...r }) => ({
          ...r,
          activeDuring: activeDuring ?? [],
          actions: actions ?? [],
        })),
        passengerInformation,
      },
    ],
  } as unknown as Scenario;
}
