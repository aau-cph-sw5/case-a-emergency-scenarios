import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";



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

function validate (scenario: Scenario, fileName: string): string[]{
    const errors: string[] = [];

    const versionNames = scenario.versions.map(v => v.version);
    if (!versionNames.includes(scenario.currentVersion)) {
        errors.push(`${fileName}: currentVersion "${scenario.currentVersion}" does not exist in versions.`);
    }

    scenario.covers.forEach((cover, index) => {
        if(cover.trackNumber !== 1 && cover.trackNumber !== 2) {
            errors.push(`${fileName}: covers[${index}].trackNumber "${cover.trackNumber}" is not 1 or 2.`);
        }
        if(cover.stationA === cover.stationB) {
            errors.push(`${fileName}: covers[${index}] has the same station for A and B.`);
        }
        

    });

    scenario.versions.forEach((version) => {
        version.operatingPlan.patterns.forEach((pattern, index) => {
            const where = `${fileName}: version ${version.version} patterns[${index}]`;

            if (pattern.operationType !== "PENDULUM" && pattern.operationType !== "ROUNDTRIP") {
                errors.push(`${where}.operationType "${pattern.operationType}" is not "PENDULUM" or "ROUNDTRIP".`);
            }
            if (pattern.trackNumber !== 1 && pattern.trackNumber !== 2 && pattern.trackNumber !== 12) {
                errors.push(`${where}.trackNumber "${pattern.trackNumber}" is not 1, 2 or 12.`);
            }
            const sequences = pattern.route.map(stop => stop.sequence);
            sequences.sort((a, b) => a - b);
            for (let i = 0; i < sequences.length; i++) {
            if (sequences[i] !== i + 1){
                errors.push(`${where}: route sequences are not consecutive starting from 1.`);
                break;
            }
            }
        });
    });
    scenario.versions.forEach((version) => {
        (version.stationRequirements ?? []).forEach((requirement, reqIndex) => {
        (requirement.activeDuring ?? []).forEach((window, winIndex) => {
            if (window.startTime == window.endTime) {
                errors.push(`${fileName}: version ${version.version} stationRequirements[${reqIndex}] (${requirement.station}) activeDuring[${winIndex}] startTime and endTime are both "${window.startTime}".`);
                }
            });
        });
    });

    const allowedChannels = ["PA", "PID"];
    scenario.versions.forEach((version) => {
        (version.passengerInformation ?? []).forEach((info, infoIndex) => {
            if (!allowedChannels.includes(info.channel)) {
                errors.push(`${fileName}: version ${version.version} passengerInformation[${infoIndex}] channel "${info.channel}" is not one of ${allowedChannels.join(", ")}.`);
            }
        });
    });
    return errors;

}


const dir = "docs/scenario-state";
const seedFiles = readdirSync(dir).filter(
  f => f.startsWith("SeedDataScenario_") && f.endsWith(".json")
);
const allErrors: string[] = [];
const seenIds = new Map<string, string>();
const scenarios: Scenario[] = [];

for (const fileName of seedFiles) {
    const scenario: Scenario = JSON.parse(readFileSync(join(dir, fileName), "utf8"));
    allErrors.push(...validate(scenario, fileName));
    scenarios.push(scenario);

    const firstFile = seenIds.get(scenario.scenarioId);
    if (firstFile !== undefined) {
        allErrors.push(`${fileName}: scenarioId "${scenario.scenarioId}" is already used in ${firstFile}.`);
    } else {
        seenIds.set(scenario.scenarioId, fileName);
    }
}

if (allErrors.length > 0) {
    console.error(allErrors.join("\n"));
    process.exit(1);
}
async function getStationId(client: pg.Client, code: string): Promise<number> {
    const result = await client.query(
        `INSERT INTO stations (code) VALUES ($1)
         ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
         RETURNING id`,
        [code]
    );
    return result.rows[0].id;
}
async function getTrackSegmentId(client: pg.Client, trackNumber: number, stationA: string, stationB: string): Promise<number> {
    const aId = await getStationId(client, stationA);
    const bId = await getStationId(client, stationB);
 
    const existing = await client.query(
        `SELECT id FROM track_segments
         WHERE track_number = $1
           AND LEAST(station_a_id, station_b_id)    = LEAST($2::int, $3::int)
           AND GREATEST(station_a_id, station_b_id) = GREATEST($2::int, $3::int)`,
        [trackNumber, aId, bId]
    );
    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }
 
    const created = await client.query(
        `INSERT INTO track_segments (track_number, station_a_id, station_b_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [trackNumber, aId, bId]
    );
    return created.rows[0].id;
}
async function loadScenario(client: pg.Client, scenario: Scenario): Promise<void> {
    await client.query("DELETE from WHERE scennario_id = $1)", [scenario.scenarioId]);

    await client.query("INSERT INTO scenarios (scenario_id, name) VALUES ($1, $2)", [scenario.scenarioId, scenario.name]);

    for (const cover of scenario.covers) {
        const segmentId = await getTrackSegmentId(client, cover.trackNumber, cover.stationA, cover.stationB);
        await client.query(
            `INSERT INTO scenario_covers (scenario_id, track_segment_id) VALUES ($1, $2)`,
            [scenario.scenarioId, segmentId]
        );
    }

    const versionIds = new Map<string, number>();

    for (const version of scenario.versions) {
        const versionResult = await client.query(
            `INSERT INTO scenario_versions (scenario_id, version, revision) VALUES ($1, $2, $3) RETURNING id`, 
            [scenario.scenarioId, version.version, version.revision]
        );
        const versionId: number = versionResult.rows[0].id;
        versionIds.set(version.version, versionId);

        const planResult = await client.query(`INSERT INTO operating_plans (scenario_version_id, name)
             VALUES ($1, $2)
             RETURNING id`,[versionId, version.operatingPlan.name]
        );
        const planId: number = planResult.rows[0].id;
        for (const pattern of version.operatingPlan.patterns) {
            const patternResult = await client.query(`INSERT INTO patterns (operating_plan_id, operation_type, route_code, track_number, 
                maximum_trains, did, description)VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [   planId, 
                pattern.operationType, 
                pattern.routeCode, 
                pattern.trackNumber, 
                pattern.maximumTrains, 
                pattern.did, 
                pattern.description ?? null]
            );
            const patternId: number = patternResult.rows[0].id;

            for (const stop of pattern.route) {
                await client.query(`INSERT INTO pattern_stops (operating_pattern_id, station_id, sequence) VALUES ($1, $2, $3)`,
                [patternId, await getStationId(client, stop.station), stop]);
                }
            }


async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to seed production");
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
            await client.query("SELECT load_scenario($1::jsonb)", [JSON.stringify(scenario)]);
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
