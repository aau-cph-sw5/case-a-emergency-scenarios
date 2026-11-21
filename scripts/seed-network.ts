import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { isInsideRepo } from "./lib/seed-data.mjs";
import {
  describeTarget,
  parseSeedJson,
  seedConnection,
} from "./seed-scenarios.js";

export interface NetworkSeed {
  stations: { code: string; name: string; x: number; y: number }[];
  segments: { trackNumber: 1 | 2; stationA: string; stationB: string }[];
  normalPatterns: {
    line: "M1" | "M2" | "M3" | "M4";
    routeCode: string;
    operationType: "PENDULUM" | "ROUNDTRIP";
    trackNumber: 1 | 2 | 12;
    maximumTrains: number;
    did: string;
    color: string;
    stops: string[];
  }[];
}

// Check the complete input before opening a transaction or changing data.
export function validateNetwork(data: NetworkSeed): string[] {
  const errors: string[] = [];
  if (
    !data ||
    !Array.isArray(data.stations) ||
    !Array.isArray(data.segments) ||
    !Array.isArray(data.normalPatterns)
  ) {
    return [
      "Network data must contain stations, segments and normalPatterns arrays.",
    ];
  }
  const stationCodes = new Set<string>();
  data.stations.forEach((station, index) => {
    if (
      !station ||
      typeof station.code !== "string" ||
      !station.code.trim() ||
      typeof station.name !== "string" ||
      !station.name.trim() ||
      !Number.isFinite(station.x) ||
      !Number.isFinite(station.y)
    ) {
      errors.push(
        `stations[${index}] needs a code, name and finite x/y positions.`,
      );
      return;
    }
    if (stationCodes.has(station.code))
      errors.push(`stations[${index}] repeats a station code.`);
    stationCodes.add(station.code);
  });
  const segmentKeys = new Set<string>();
  data.segments.forEach((segment, index) => {
    if (
      !segment ||
      ![1, 2].includes(segment.trackNumber) ||
      !stationCodes.has(segment.stationA) ||
      !stationCodes.has(segment.stationB) ||
      segment.stationA === segment.stationB
    ) {
      errors.push(
        `segments[${index}] needs track 1 or 2 and two different known stations.`,
      );
      return;
    }
    const [firstStation, secondStation] =
      segment.stationA < segment.stationB
        ? [segment.stationA, segment.stationB]
        : [segment.stationB, segment.stationA];
    const key = JSON.stringify([
      segment.trackNumber,
      firstStation,
      secondStation,
    ]);
    if (segmentKeys.has(key))
      errors.push(`segments[${index}] repeats a track segment.`);
    segmentKeys.add(key);
  });
  const patternKeys = new Set<string>();
  data.normalPatterns.forEach((pattern, index) => {
    if (
      !pattern ||
      !["M1", "M2", "M3", "M4"].includes(pattern.line) ||
      !["PENDULUM", "ROUNDTRIP"].includes(pattern.operationType) ||
      ![1, 2, 12].includes(pattern.trackNumber) ||
      !Number.isInteger(pattern.maximumTrains) ||
      pattern.maximumTrains < 0 ||
      typeof pattern.did !== "string" ||
      !pattern.did.trim() ||
      typeof pattern.color !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(pattern.color) ||
      typeof pattern.routeCode !== "string" ||
      !pattern.routeCode.trim() ||
      !Array.isArray(pattern.stops) ||
      pattern.stops.length < 2 ||
      pattern.stops.some((code) => !stationCodes.has(code))
    ) {
      errors.push(
        `normalPatterns[${index}] needs a valid line, route, operation, track, train count, DID, hex color and at least two known stops.`,
      );
      return;
    }
    const key = JSON.stringify([pattern.line, pattern.routeCode]);
    if (patternKeys.has(key))
      errors.push(`normalPatterns[${index}] repeats a line and route code.`);
    patternKeys.add(key);
  });
  return errors;
}

export async function seedNetwork(
  client: pg.Client,
  data: NetworkSeed,
): Promise<void> {
  const errors = validateNetwork(data);
  if (errors.length) throw new Error(errors.join("\n"));
  await client.query("BEGIN");
  try {
    // Serialize normal-pattern upserts: their existing schema has no unique key.
    await client.query(
      "LOCK TABLE operating_patterns IN SHARE ROW EXCLUSIVE MODE",
    );
    const stationIds = new Map<string, number>();
    for (const station of data.stations) {
      const result = await client.query(
        `INSERT INTO stations (code, name) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [station.code, station.name],
      );
      const id: number = result.rows[0].id;
      stationIds.set(station.code, id);
      await client.query(
        `INSERT INTO station_map_positions (station_id, x, y) VALUES ($1, $2, $3)
         ON CONFLICT (station_id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y`,
        [id, station.x, station.y],
      );
    }
    for (const segment of data.segments) {
      // Match either endpoint order without rewriting existing endpoints: a
      // crossover's relative position depends on that order.
      const a = stationIds.get(segment.stationA)!;
      const b = stationIds.get(segment.stationB)!;
      await client.query(
        `INSERT INTO track_segments (track_number, station_a_id, station_b_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [segment.trackNumber, a, b],
      );
    }
    for (const pattern of data.normalPatterns) {
      const existing = await client.query(
        "SELECT id FROM operating_patterns WHERE normal_line = $1 AND route_code = $2",
        [pattern.line, pattern.routeCode],
      );
      if (existing.rowCount && existing.rowCount > 1)
        throw new Error(
          "A normal line and route code match multiple existing patterns.",
        );
      const values = [
        pattern.operationType,
        pattern.trackNumber,
        pattern.maximumTrains,
        pattern.did,
        pattern.color,
      ];
      let id: number;
      if (existing.rowCount) {
        id = existing.rows[0].id;
        await client.query(
          "UPDATE operating_patterns SET operation_type = $1, track_number = $2, maximum_trains = $3, did = $4, color = $5 WHERE id = $6",
          [...values, id],
        );
        await client.query(
          "DELETE FROM line_stops WHERE operating_pattern_id = $1",
          [id],
        );
      } else {
        const created = await client.query(
          `INSERT INTO operating_patterns (normal_line, route_code, operation_type, track_number, maximum_trains, did, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [pattern.line, pattern.routeCode, ...values],
        );
        id = created.rows[0].id;
      }
      for (const [index, station] of pattern.stops.entries()) {
        await client.query(
          "INSERT INTO line_stops (operating_pattern_id, station_id, sequence) VALUES ($1, $2, $3)",
          [id, stationIds.get(station), index + 1],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Refusing to seed");
  const path = process.env.NETWORK_SEED_FILE;
  if (!path)
    throw new Error(
      "NETWORK_SEED_FILE must point to a network JSON file outside the repository.",
    );
  if (isInsideRepo(path))
    throw new Error("NETWORK_SEED_FILE must be outside the repository.");
  let data: NetworkSeed;
  try {
    data = parseSeedJson<NetworkSeed>(readFileSync(path, "utf8"));
  } catch {
    throw new Error(
      "Could not read valid network JSON from NETWORK_SEED_FILE.",
    );
  }
  const errors = validateNetwork(data);
  if (errors.length) throw new Error(errors.join("\n"));
  const config = seedConnection(process.env);
  const client = new pg.Client(config);
  await client.connect();
  try {
    await seedNetwork(client, data);
    console.log(`Seeded network into ${describeTarget(config)}.`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Network seed failed.",
    );
    process.exitCode = 1;
  });
}
