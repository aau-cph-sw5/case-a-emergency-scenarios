import type { CreateScenarioRequest } from "../../shared/types/v1/create-scenario-request.js";
import { connectionKey, resolveStops } from "../../shared/network/network.js";
import { selectTurnbacks } from "../../shared/network/turnbacks.js";
import { getDatabase } from "../db/client.js";

export class InvalidScenarioData extends Error {}

export async function createScenario(
  input: CreateScenarioRequest,
): Promise<void> {
  const sql = getDatabase();
  await sql.begin(async (tx) => {
    const stations = await tx<
      { id: number; code: string }[]
    >`SELECT id, code FROM stations`;
    const ids = new Map(stations.map((station) => [station.code, station.id]));
    const normalEdges = await tx<
      {
        stationA: string;
        stationB: string;
        normalLine: string;
        trackNumber: 1 | 2;
        segmentId: number;
      }[]
    >`
      WITH ordered_stops AS (
        SELECT op.normal_line, op.track_number AS normal_track, stop.station_id,
               LEAD(stop.station_id) OVER (PARTITION BY op.id ORDER BY stop.sequence) AS next_station_id
        FROM operating_patterns op
        JOIN line_stops stop ON stop.operating_pattern_id = op.id
        WHERE (op.normal_line IN ('M1', 'M2') AND ${input.lineGroup} = 'M1_M2')
           OR (op.normal_line IN ('M3', 'M4') AND ${input.lineGroup} = 'M3_M4')
      )
      SELECT a.code AS station_a, b.code AS station_b, stop.normal_line, t.track_number, t.id AS segment_id
      FROM ordered_stops stop
      JOIN stations a ON a.id = stop.station_id
      JOIN stations b ON b.id = stop.next_station_id
      JOIN track_segments t ON ((t.station_a_id = a.id AND t.station_b_id = b.id)
                         OR (t.station_a_id = b.id AND t.station_b_id = a.id))
                         AND (stop.normal_track = 12 OR stop.normal_track = t.track_number)
    `;
    const stationsInGroup = new Set(
      normalEdges.flatMap((edge) => [edge.stationA, edge.stationB]),
    );
    const allowedSegments = new Set(normalEdges.map((edge) => edge.segmentId));
    const allowedTracks = new Set(
      normalEdges.map(
        (edge) =>
          `${edge.trackNumber}:${connectionKey(edge.stationA, edge.stationB)}`,
      ),
    );
    if (input.coveredSegmentIds.some((id) => !allowedSegments.has(id)))
      throw new InvalidScenarioData(
        "Affected tracks must belong to the selected line group.",
      );
    const requirementStations = input.stationRequirements.map(
      (requirement) => requirement.station,
    );
    if (
      new Set(requirementStations).size !== requirementStations.length ||
      requirementStations.some((station) => !stationsInGroup.has(station))
    )
      throw new InvalidScenarioData(
        "Staffed stations must be unique and belong to the selected line group.",
      );
    if (
      input.stationRequirements.some((requirement) =>
        (requirement.activeDuring ?? []).some(
          (window) => window.startTime === window.endTime,
        ),
      )
    )
      throw new InvalidScenarioData(
        "Staffing start and end times must differ.",
      );
    const coveredSegments = new Set(input.coveredSegmentIds);
    const networkSegments = normalEdges.map(
      ({ segmentId, stationA, stationB, trackNumber }) => ({
        id: segmentId,
        stationA,
        stationB,
        trackNumber,
      }),
    );
    const normalLines = [
      ...new Set(normalEdges.map((edge) => edge.normalLine)),
    ].map((name) => {
      const edges = normalEdges.filter((edge) => edge.normalLine === name);
      const connectionTracks: Record<string, number[]> = {};
      for (const edge of edges) {
        const key = connectionKey(edge.stationA, edge.stationB);
        (connectionTracks[key] ??= []).push(edge.trackNumber);
      }
      return {
        name,
        tracks: [1, 2],
        connections: edges.map(({ stationA, stationB }): [string, string] => [
          stationA,
          stationB,
        ]),
        connectionTracks,
      };
    });
    for (const pattern of input.patterns) {
      if (
        (pattern.operationType === "ROUNDTRIP") !==
        (pattern.trackNumber === 12)
      )
        throw new InvalidScenarioData(
          "Roundtrips require both tracks; pendulums use one track.",
        );
      const tracks =
        pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber];
      if (
        pattern.stops.some(
          (station, index) => index > 0 && station === pattern.stops[index - 1],
        )
      )
        throw new InvalidScenarioData("Consecutive stops must differ.");
      const resolved = resolveStops(
        pattern.stops,
        normalLines,
        networkSegments,
        tracks,
      );
      if (resolved.incomplete || resolved.connections.length === 0)
        throw new InvalidScenarioData(
          "A pattern uses a track outside the selected line group.",
        );
      if (pattern.operationType === "ROUNDTRIP") {
        const path = [
          pattern.stops[0],
          ...resolved.connections.map(([, station]) => station),
        ];
        const turns = selectTurnbacks(
          input.lineGroup === "M1_M2" ? "M1/M2" : "M3/M4",
          path,
          normalLines,
          networkSegments,
        );
        for (const turn of [turns.start, turns.end]) {
          if (!turn?.extension) continue;
          const key = connectionKey(...turn.extension);
          if (
            normalEdges.some(
              (edge) =>
                coveredSegments.has(edge.segmentId) &&
                connectionKey(edge.stationA, edge.stationB) === key,
            )
          )
            throw new InvalidScenarioData(
              "A turnback uses an unavailable track.",
            );
        }
      }
      for (const [a, b] of resolved.connections) {
        if (
          tracks.some(
            (track) => !allowedTracks.has(`${track}:${connectionKey(a, b)}`),
          )
        )
          throw new InvalidScenarioData(
            "A pattern uses a track outside the selected line group.",
          );
        if (
          normalEdges.some(
            (edge) =>
              coveredSegments.has(edge.segmentId) &&
              tracks.includes(edge.trackNumber) &&
              connectionKey(edge.stationA, edge.stationB) ===
                connectionKey(a, b),
          )
        )
          throw new InvalidScenarioData("A pattern uses an unavailable track.");
      }
    }
    await tx`INSERT INTO scenarios (scenario_id, name, line_group) VALUES (${input.scenarioId.trim()}, ${input.name.trim()}, ${input.lineGroup})`;
    const [version] = await tx<{ id: number }[]>`
      INSERT INTO scenario_versions (scenario_id, version, revision, operating_plan_name)
      VALUES (${input.scenarioId.trim()}, ${input.version.trim()}, ${input.revision.trim()}, ${input.name.trim()}) RETURNING id
    `;
    await tx`UPDATE scenarios SET current_version_id = ${version.id} WHERE scenario_id = ${input.scenarioId.trim()}`;
    for (const pattern of input.patterns) {
      const [created] = await tx<{ id: number }[]>`
        INSERT INTO operating_patterns (scenario_version_id, operation_type, route_code, track_number, maximum_trains, did, color)
        VALUES (${version.id}, ${pattern.operationType}, ${`${pattern.stops[0]}-${pattern.stops.at(-1)}`}, ${pattern.trackNumber}, ${pattern.maximumTrains}, ${pattern.did.trim()}, ${pattern.color}) RETURNING id
      `;
      for (const [index, code] of pattern.stops.entries()) {
        await tx`INSERT INTO line_stops (operating_pattern_id, station_id, sequence) VALUES (${created.id}, ${ids.get(code)!}, ${index + 1})`;
      }
    }
    for (const requirement of input.stationRequirements) {
      const [created] = await tx<{ id: number }[]>`
        INSERT INTO station_requirements (scenario_version_id, station_id, placement, minimum_staffing)
        VALUES (${version.id}, ${ids.get(requirement.station)!}, ${requirement.placement.trim()}, ${requirement.minimumStaffing}) RETURNING id
      `;
      for (const window of requirement.activeDuring ?? []) {
        await tx`INSERT INTO staffing_windows (station_requirement_id, day_pattern, start_time, end_time) VALUES (${created.id}, ${window.dayPattern.trim()}, ${window.startTime}, ${window.endTime})`;
      }
      for (const [index, instruction] of requirement.actions.entries()) {
        await tx`INSERT INTO actions (station_requirement_id, sequence, instruction) VALUES (${created.id}, ${index + 1}, ${instruction.trim()})`;
      }
    }
    for (const segmentId of input.coveredSegmentIds) {
      await tx`INSERT INTO scenario_covers (scenario_id, track_segment_id) VALUES (${input.scenarioId.trim()}, ${segmentId})`;
    }
  });
}
