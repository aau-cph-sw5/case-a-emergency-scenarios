import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  FETCH_HINT,
  SEED_DATA_DIR,
  STATIONS_FILE,
  findSeedData,
} from "./lib/seed-data.mjs";

interface Scenario {
  scenarioId: string;
  name: string;
  currentVersion: string;
  covers: Cover[];
  versions: Version[];
}

interface Cover {
  trackNumber: number;
  stationA: string;
  stationB: string;
}
interface Version {
  version: string;
  revision: string;
  operatingPlan: OperatingPlan;
  stationRequirements?: StationRequirement[];
  passengerInformation?: PassengerInformation[];
}
interface OperatingPlan {
  name: string;
  patterns: Pattern[];
}
interface Pattern {
  operationType: string;
  routeCode: string;
  trackNumber: number;
  maximumTrains: number;
  did: string;
  description?: string;
  route: Route[];
}
interface Route {
  sequence: number;
  station: string;
}
interface StationRequirement {
  station: string;
  placement: string;
  minimumStaffing: number;
  activeDuring?: StaffingWindow[];
  actions?: Action[];
}
interface StaffingWindow {
  dayPattern: string;
  startTime: string;
  endTime: string;
}
interface Action {
  sequence: number;
  instruction: string;
}

interface PassengerInformation {
  channel: string;
  language: string;
  message: string;
}

function validate(
  scenario: Scenario,
  fileName: string,
  allowedStations: Set<string>,
): string[] {
  const errors: string[] = [];
  const checkStation = (code: string, where: string) => {
    if (!allowedStations.has(code)) {
      errors.push(`${where}: unknown station "${code}".`);
    }
  };

  const versionNames = scenario.versions.map((v) => v.version);
  if (!versionNames.includes(scenario.currentVersion)) {
    errors.push(
      `${fileName}: currentVersion "${scenario.currentVersion}" does not exist in versions.`,
    );
  }

  scenario.covers.forEach((cover, index) => {
    if (cover.trackNumber !== 1 && cover.trackNumber !== 2) {
      errors.push(
        `${fileName}: covers[${index}].trackNumber "${cover.trackNumber}" is not 1 or 2.`,
      );
    }
    if (cover.stationA === cover.stationB) {
      errors.push(
        `${fileName}: covers[${index}] has the same station for A and B.`,
      );
    }
    checkStation(cover.stationA, `${fileName}: covers[${index}].stationA`);
    checkStation(cover.stationB, `${fileName}: covers[${index}].stationB`);
  });

  scenario.versions.forEach((version) => {
    version.operatingPlan.patterns.forEach((pattern, index) => {
      const where = `${fileName}: version ${version.version} patterns[${index}]`;

      if (
        pattern.operationType !== "PENDULUM" &&
        pattern.operationType !== "ROUNDTRIP"
      ) {
        errors.push(
          `${where}.operationType "${pattern.operationType}" is not "PENDULUM" or "ROUNDTRIP".`,
        );
      }
      if (
        pattern.trackNumber !== 1 &&
        pattern.trackNumber !== 2 &&
        pattern.trackNumber !== 12
      ) {
        errors.push(
          `${where}.trackNumber "${pattern.trackNumber}" is not 1, 2 or 12.`,
        );
      }
      const sequences = pattern.route.map((stop) => stop.sequence);
      sequences.sort((a, b) => a - b);
      for (let i = 0; i < sequences.length; i++) {
        if (sequences[i] !== i + 1) {
          errors.push(
            `${where}: route sequences are not consecutive starting from 1.`,
          );
          break;
        }
      }
      pattern.route.forEach((stop, stopIndex) => {
        checkStation(stop.station, `${where}.route[${stopIndex}]`);
      });
    });
  });
  scenario.versions.forEach((version) => {
    (version.stationRequirements ?? []).forEach((requirement, reqIndex) => {
      checkStation(
        requirement.station,
        `${fileName}: version ${version.version} stationRequirements[${reqIndex}]`,
      );

      (requirement.activeDuring ?? []).forEach((window, winIndex) => {
        if (window.startTime === window.endTime) {
          errors.push(
            `${fileName}: version ${version.version} stationRequirements[${reqIndex}] (${requirement.station}) activeDuring[${winIndex}] startTime and endTime are both "${window.startTime}".`,
          );
        }
      });
    });
  });

  const allowedChannels = ["PA", "PID"];
  scenario.versions.forEach((version) => {
    (version.passengerInformation ?? []).forEach((info, infoIndex) => {
      if (!allowedChannels.includes(info.channel)) {
        errors.push(
          `${fileName}: version ${version.version} passengerInformation[${infoIndex}] channel "${info.channel}" is not one of ${allowedChannels.join(", ")}.`,
        );
      }
    });
  });
  return errors;
}

const dir = SEED_DATA_DIR;
const { scenarioFiles: seedFiles, problem } = findSeedData(dir);
if (problem) {
  console.error(`${problem}\n${FETCH_HINT}`);
  process.exit(1);
}
const stationList: { code: string; name: string }[] = JSON.parse(
  readFileSync(join(dir, STATIONS_FILE), "utf8"),
);
const stationNames = new Map(stationList.map((s) => [s.code, s.name]));
const allowedStations = new Set(stationNames.keys());
const allErrors: string[] = [];
const seenIds = new Map<string, string>();
const scenarios: Scenario[] = [];

for (const fileName of seedFiles) {
  const scenario: Scenario = JSON.parse(
    readFileSync(join(dir, fileName), "utf8"),
  );
  allErrors.push(...validate(scenario, fileName, allowedStations));
  scenarios.push(scenario);

  const firstFile = seenIds.get(scenario.scenarioId);
  if (firstFile !== undefined) {
    allErrors.push(
      `${fileName}: scenarioId "${scenario.scenarioId}" is already used in ${firstFile}.`,
    );
  } else {
    seenIds.set(scenario.scenarioId, fileName);
  }
}

if (allErrors.length > 0) {
  console.error(allErrors.join("\n"));
  process.exit(1);
}
async function getStationId(client: pg.Client, code: string): Promise<number> {
  const name = stationNames.get(code);
  if (name === undefined) {
    throw new Error(`Station "${code}" is not in stations.json.`);
  }
  const result = await client.query(
    `INSERT INTO stations (code, name) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    [code, name],
  );
  return result.rows[0].id;
}
async function getTrackSegmentId(
  client: pg.Client,
  trackNumber: number,
  stationA: string,
  stationB: string,
): Promise<number> {
  const aId = await getStationId(client, stationA);
  const bId = await getStationId(client, stationB);

  const existing = await client.query(
    `SELECT id FROM track_segments
         WHERE track_number = $1
           AND LEAST(station_a_id, station_b_id)    = LEAST($2::int, $3::int)
           AND GREATEST(station_a_id, station_b_id) = GREATEST($2::int, $3::int)`,
    [trackNumber, aId, bId],
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const created = await client.query(
    `INSERT INTO track_segments (track_number, station_a_id, station_b_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
    [trackNumber, aId, bId],
  );
  return created.rows[0].id;
}
async function loadScenario(
  client: pg.Client,
  scenario: Scenario,
): Promise<void> {
  await client.query("DELETE FROM scenarios WHERE scenario_id = $1", [
    scenario.scenarioId,
  ]);
  await client.query(
    "INSERT INTO scenarios (scenario_id, name) VALUES ($1, $2)",
    [scenario.scenarioId, scenario.name],
  );

  for (const cover of scenario.covers) {
    const segmentId = await getTrackSegmentId(
      client,
      cover.trackNumber,
      cover.stationA,
      cover.stationB,
    );
    await client.query(
      `INSERT INTO scenario_covers (scenario_id, track_segment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [scenario.scenarioId, segmentId],
    );
  }

  const versionIds = new Map<string, number>();

  for (const version of scenario.versions) {
    const versionResult = await client.query(
      `INSERT INTO scenario_versions (scenario_id, version, revision) VALUES ($1, $2, $3) RETURNING id`,
      [scenario.scenarioId, version.version, version.revision],
    );
    const versionId: number = versionResult.rows[0].id;
    versionIds.set(version.version, versionId);

    const planResult = await client.query(
      `INSERT INTO operating_plans (scenario_version_id, name)
             VALUES ($1, $2)
             RETURNING id`,
      [versionId, version.operatingPlan.name],
    );
    const planId: number = planResult.rows[0].id;
    for (const pattern of version.operatingPlan.patterns) {
      const patternResult = await client.query(
        `INSERT INTO operating_patterns (operating_plan_id, operation_type, route_code, track_number, 
                maximum_trains, did, description)VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          planId,
          pattern.operationType,
          pattern.routeCode,
          pattern.trackNumber,
          pattern.maximumTrains,
          pattern.did,
          pattern.description ?? null,
        ],
      );
      const patternId: number = patternResult.rows[0].id;

      for (const stop of pattern.route) {
        await client.query(
          `INSERT INTO line_stops (operating_pattern_id, station_id, sequence) VALUES ($1, $2, $3)`,
          [patternId, await getStationId(client, stop.station), stop.sequence],
        );
      }
    }
    for (const requirement of version.stationRequirements ?? []) {
      const reqResult = await client.query(
        `INSERT INTO station_requirements (scenario_version_id, station_id, placement, minimum_staffing) 
                VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          versionId,
          await getStationId(client, requirement.station),
          requirement.placement,
          requirement.minimumStaffing,
        ],
      );
      const requirementId: number = reqResult.rows[0].id;

      for (const window of requirement.activeDuring ?? []) {
        await client.query(
          `INSERT INTO staffing_windows (station_requirement_id, day_pattern, start_time, end_time) VALUES ($1, $2, $3, $4)`,
          [requirementId, window.dayPattern, window.startTime, window.endTime],
        );
      }

      for (const action of requirement.actions ?? []) {
        await client.query(
          `INSERT INTO actions (station_requirement_id, sequence, instruction) VALUES ($1, $2, $3)`,
          [requirementId, action.sequence, action.instruction],
        );
      }
    }
    for (const info of version.passengerInformation ?? []) {
      await client.query(
        `INSERT INTO passenger_information (scenario_version_id, channel, language, message) VALUES ($1, $2, $3, $4)`,
        [versionId, info.channel, info.language, info.message],
      );
    }
  }
  const currentVersionId = versionIds.get(scenario.currentVersion);
  if (currentVersionId === undefined) {
    throw new Error(
      `Scenario ${scenario.scenarioId}: currentVersion "${scenario.currentVersion}" does not exist in versions.`,
    );
  }
  await client.query(
    `UPDATE scenarios SET current_version_id = $1 WHERE scenario_id = $2`,
    [currentVersionId, scenario.scenarioId],
  );
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed");
  }
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error(
      "POSTGRES_PASSWORD is not set. Does .env exist, and is the script run with --env-file=.env?",
    );
  }

  const client = new pg.Client({
    host: "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: "metro",
    password: process.env.POSTGRES_PASSWORD,
    database: "metro",
  });
  await client.connect();

  try {
    await client.query("BEGIN");

    for (const scenario of scenarios) {
      await loadScenario(client, scenario);
    }

    await client.query("COMMIT");
    console.log(`Seeded ${scenarios.length} scenario(s).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
