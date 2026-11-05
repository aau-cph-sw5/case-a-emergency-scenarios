import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fail, succeed } from "./lib/output.mjs";
import pg from "pg";
import {
  FETCH_HINT,
  SEED_DATA_DIR,
  SEED_SCENARIOS_DIR,
  SHAFTS_FILE,
  STATIONS_FILE,
  findSeedData,
} from "./lib/seed-data.mjs";

export interface Scenario {
  scenarioId: string;
  name: string;
  lineGroup: "M1_M2" | "M3_M4";
  currentVersion: string;
  covers?: Cover[];
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
  station?: string;
  shafts?: string;
}
function stopCode(stop: Route): string | undefined {
  return stop.station ?? stop.shafts;
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

// The values that appear more than once, each listed once.
function duplicates<T>(values: T[]): T[] {
  const seen = new Set<T>();
  const repeated = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

export function validate(
  scenario: Scenario,
  fileName: string,
  allowedStations: Set<string>,
  shaftCodes: Set<string>,
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
  for (const name of duplicates(versionNames)) {
    errors.push(
      `${fileName}: version "${name}" appears more than once in versions.`,
    );
  }

  (scenario.covers ?? []).forEach((cover, index) => {
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

  const lineGroup = scenario.lineGroup;
  if (lineGroup !== "M1_M2" && lineGroup !== "M3_M4") {
    errors.push(
      `${fileName}: lineGroup "${lineGroup}" but must be either "M1_M2" or "M3_M4".`,
    );
  }

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
      if (pattern.maximumTrains < 0) {
        errors.push(
          `${where}.maximumTrains is ${pattern.maximumTrains}, but must be 0 or more.`,
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
        const stopWhere = `${where}.route[${stopIndex}]`;
        if ((stop.station === undefined) === (stop.shafts === undefined)) {
          errors.push(
            `${stopWhere}: must have either a station or a shaft, but not both. Got ${JSON.stringify(stop)}`,
          );
          return;
        }
        const code = stopCode(stop)!;
        if (stop.shafts !== undefined && !shaftCodes.has(code)) {
          errors.push(`${stopWhere}: unknown shaft code "${code}".`);
        } else {
          checkStation(code, stopWhere);
        }
      });
    });
  });
  scenario.versions.forEach((version) => {
    (version.stationRequirements ?? []).forEach((requirement, reqIndex) => {
      const where = `${fileName}: version ${version.version} stationRequirements[${reqIndex}]`;
      checkStation(requirement.station, where);

      if (requirement.minimumStaffing < 0) {
        errors.push(
          `${where}.minimumStaffing is ${requirement.minimumStaffing}, but must be 0 or more.`,
        );
      }
      const actionSequences = (requirement.actions ?? []).map(
        (action) => action.sequence,
      );
      for (const sequence of duplicates(actionSequences)) {
        errors.push(
          `${where}.actions: sequence ${sequence} is used by more than one action.`,
        );
      }

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

let stationNames = new Map<string, string>();
export function parseSeedJson<T>(text: string): T {
  return JSON.parse(text, (_key, value) =>
    typeof value === "string" ? value.normalize("NFC") : value,
  ) as T;
}

function readSeedData() {
  const { scenarioFiles: seedFiles, problem } = findSeedData(
    SEED_DATA_DIR,
    SEED_SCENARIOS_DIR,
  );
  if (problem || !SEED_SCENARIOS_DIR) {
    fail(problem ?? "SEED_SCENARIOS_DIR is not set.");
    console.error(FETCH_HINT);
    process.exit(1);
  }
  const stations = parseSeedJson<{ code: string; name: string }[]>(
    readFileSync(join(SEED_DATA_DIR, STATIONS_FILE), "utf8"),
  );
  const shafts = parseSeedJson<{ code: string; name: string }[]>(
    readFileSync(join(SEED_DATA_DIR, SHAFTS_FILE), "utf8"),
  );
  const stationList = [...stations, ...shafts];
  const allowedStations = new Set(stationList.map((s) => s.code));
  const shaftCodes = new Set(shafts.map((s) => s.code));

  const files = seedFiles.map((fileName) => ({
    fileName,
    text: readFileSync(join(SEED_SCENARIOS_DIR, fileName), "utf8"),
  }));
  const { scenarios, errors } = checkScenarioFiles(
    files,
    allowedStations,
    shaftCodes,
  );
  if (errors.length > 0) {
    fail(errors.join("\n"));
    process.exit(1);
  }
  return { scenarios, stationList };
}

// The public, synthetic DEMO scenarios and their stations, for a clone without
// the private seed data. `npm run seed:demo` loads them.
export const DEMO_SCENARIOS_DIR = "fixtures/v1/scenarios";
export const DEMO_STATIONS_FILE = "fixtures/v1/demo-stations.json";

export function readDemoData(
  scenariosDir = DEMO_SCENARIOS_DIR,
  stationsFile = DEMO_STATIONS_FILE,
) {
  const stationList = parseSeedJson<{ code: string; name: string }[]>(
    readFileSync(stationsFile, "utf8"),
  );
  const files = readdirSync(scenariosDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => ({
      fileName,
      text: readFileSync(join(scenariosDir, fileName), "utf8"),
    }));
  const { scenarios, errors } = checkScenarioFiles(
    files,
    new Set(stationList.map((s) => s.code)),
    new Set(),
  );
  if (errors.length > 0) {
    fail(errors.join("\n"));
    process.exit(1);
  }
  return { scenarios, stationList };
}

// Parses and validates every scenario file. Returns all problems from all
// files, so nothing is written to the database when any file is invalid.
export function checkScenarioFiles(
  files: { fileName: string; text: string }[],
  allowedStations: Set<string>,
  shaftCodes: Set<string>,
): { scenarios: Scenario[]; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Map<string, string>();
  const scenarios: Scenario[] = [];

  for (const { fileName, text } of files) {
    let scenario: Scenario;
    try {
      scenario = parseSeedJson<Scenario>(text);
    } catch (error) {
      errors.push(`${fileName}: ${jsonErrorWithoutContent(error)}`);
      continue;
    }
    errors.push(...validate(scenario, fileName, allowedStations, shaftCodes));
    scenarios.push(scenario);

    const firstFile = seenIds.get(scenario.scenarioId);
    if (firstFile !== undefined) {
      errors.push(
        `${fileName}: scenarioId "${scenario.scenarioId}" is already used in ${firstFile}.`,
      );
    } else {
      seenIds.set(scenario.scenarioId, fileName);
    }
  }
  return { scenarios, errors };
}

// JSON.parse puts a piece of the file in its message. The seed data is
// private, so only the position is kept.
function jsonErrorWithoutContent(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const place =
    /line \d+ column \d+/.exec(message)?.[0] ??
    /position \d+/.exec(message)?.[0];
  return place
    ? `is not valid JSON (at ${place}). Open the file in an editor to find the mistake.`
    : "is not valid JSON. Open the file in an editor to find the mistake.";
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
  await client.query(
    `INSERT INTO scenarios (scenario_id, name, line_group) VALUES ($1, $2, $3)
     ON CONFLICT (scenario_id) DO UPDATE
     SET name = EXCLUDED.name, line_group = EXCLUDED.line_group`,
    [scenario.scenarioId, scenario.name, scenario.lineGroup],
  );

  await client.query("DELETE FROM scenario_covers WHERE scenario_id = $1", [
    scenario.scenarioId,
  ]);

  for (const cover of scenario.covers ?? []) {
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
      `INSERT INTO scenario_versions (scenario_id, version, revision) VALUES ($1, $2, $3)
       ON CONFLICT (scenario_id, version) DO UPDATE SET revision = EXCLUDED.revision
       RETURNING id`,
      [scenario.scenarioId, version.version, version.revision],
    );
    const versionId: number = versionResult.rows[0].id;
    versionIds.set(version.version, versionId);

    // Replace the seed-controlled content while keeping the version ID, which
    // may already be referenced by an incident activation.
    await client.query(
      "DELETE FROM operating_plans WHERE scenario_version_id = $1",
      [versionId],
    );
    await client.query(
      "DELETE FROM station_requirements WHERE scenario_version_id = $1",
      [versionId],
    );
    await client.query(
      "DELETE FROM passenger_information WHERE scenario_version_id = $1",
      [versionId],
    );

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
          [
            patternId,
            await getStationId(client, stopCode(stop)!),
            stop.sequence,
          ],
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

export async function seedScenarios(
  client: pg.Client,
  scenarios: Scenario[],
  stations: { code: string; name: string }[],
): Promise<void> {
  stationNames = new Map(stations.map((s) => [s.code, s.name]));
  await client.query("BEGIN");
  try {
    for (const scenario of scenarios) {
      await loadScenario(client, scenario);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

// The database the seed writes to. SEED_DATABASE_URL picks another database,
// for example staging. Without it, the seed writes to the local Docker database.
// Seeding connects as the table owner, so the URL needs the owner's user.
export function seedConnection(env: NodeJS.ProcessEnv): pg.ClientConfig {
  const timeouts = { connectionTimeoutMillis: 10_000, lock_timeout: 10_000 };
  if (env.SEED_DATABASE_URL) {
    return { connectionString: env.SEED_DATABASE_URL, ...timeouts };
  }
  if (!env.POSTGRES_PASSWORD) {
    throw new Error(
      "POSTGRES_PASSWORD is not set. Does .env exist, and is the script run with --env-file=.env?",
    );
  }
  return {
    host: "localhost",
    port: Number(env.POSTGRES_PORT ?? 5432),
    user: "metro",
    password: env.POSTGRES_PASSWORD,
    database: "metro",
    ...timeouts,
  };
}

// Where the seed writes, without the password, so it can be printed.
export function describeTarget(config: pg.ClientConfig): string {
  if (config.connectionString) {
    try {
      const url = new URL(config.connectionString);
      return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
    } catch {
      return "the database in SEED_DATABASE_URL";
    }
  }
  return `localhost:${config.port}/${config.database}`;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed");
  }
  const config = seedConnection(process.env);
  const demo = process.argv.includes("--demo");
  const { scenarios, stationList } = demo ? readDemoData() : readSeedData();
  const client = new pg.Client(config);
  await client.connect();

  try {
    await seedScenarios(client, scenarios, stationList);
    succeed(
      `Seeded ${scenarios.length} ${demo ? "demo " : ""}scenario(s) into ${describeTarget(config)}.`,
    );
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
