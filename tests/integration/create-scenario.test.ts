import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import pg from "pg";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedNetwork, type NetworkSeed } from "../../scripts/seed-network.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { closeOwnerDatabase, getOwnerDatabase } from "./helpers.js";

const owner = getOwnerDatabase();
let server: Server;
let baseUrl: string;
let adminToken: string;
let operatorToken: string;
let coveredId: number;
let usedId: number;

async function login(username: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "operator123", client: "web" }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

function request(scenarioId: string) {
  return {
    scenarioId,
    name: "Created scenario",
    lineGroup: "M1_M2",
    version: "1.0",
    revision: "First revision",
    patterns: [
      {
        operationType: "PENDULUM",
        trackNumber: 1,
        did: "TEST-DID",
        color: "#724fa3",
        maximumTrains: 2,
        stops: ["CREATE-A", "CREATE-B"],
      },
    ],
    stationRequirements: [
      {
        station: "CREATE-B",
        placement: "Near stairs",
        minimumStaffing: 2,
        activeDuring: [
          { dayPattern: "MON-THU", startTime: "07:00", endTime: "09:00" },
          { dayPattern: "MON-THU", startTime: "14:00", endTime: "18:00" },
        ],
        actions: ["Stop escalator", "Inform passengers"],
      },
    ],
    coveredSegmentIds: [coveredId],
  };
}

async function post(body: unknown, token?: string) {
  return fetch(`${baseUrl}/api/v1/scenarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

before(async () => {
  const users = await seedTestUsers("create-");
  const admin = users.find((user) => user.username === "create-operator")!;
  const other = users.find((user) => user.username === "create-operator-m3m4")!;
  await owner`UPDATE users SET role = 'ADMIN' WHERE id = ${admin.id}`;
  const input: NetworkSeed = {
    stations: [
      { code: "CREATE-A", name: "A", x: 10, y: 10 },
      { code: "CREATE-B", name: "B", x: 20, y: 10 },
      { code: "CREATE-C", name: "C", x: 30, y: 10 },
    ],
    segments: [
      { trackNumber: 1, stationA: "CREATE-A", stationB: "CREATE-B" },
      { trackNumber: 2, stationA: "CREATE-A", stationB: "CREATE-B" },
      { trackNumber: 1, stationA: "CREATE-B", stationB: "CREATE-C" },
      { trackNumber: 2, stationA: "CREATE-B", stationB: "CREATE-C" },
    ],
    normalPatterns: [
      {
        line: "M1",
        routeCode: "CREATE-TEST",
        operationType: "ROUNDTRIP",
        trackNumber: 12,
        maximumTrains: 2,
        did: "TEST",
        color: "#008D40",
        stops: ["CREATE-A", "CREATE-B", "CREATE-C"],
      },
    ],
  };
  const client = new pg.Client({
    connectionString: process.env.OWNER_DATABASE_URL,
  });
  await client.connect();
  try {
    await seedNetwork(client, input);
  } finally {
    await client.end();
  }
  // Sequence values need only be ordered, not consecutive.
  await owner`UPDATE line_stops SET sequence = sequence * 10 WHERE operating_pattern_id = (SELECT id FROM operating_patterns WHERE normal_line = 'M1' AND route_code = 'CREATE-TEST')`;
  const tracks = await owner<{ id: number; trackNumber: number }[]>`
    SELECT id, track_number FROM track_segments WHERE station_a_id = (SELECT id FROM stations WHERE code = 'CREATE-A') ORDER BY track_number
  `;
  usedId = tracks.find((track) => track.trackNumber === 1)!.id;
  coveredId = tracks.find((track) => track.trackNumber === 2)!.id;
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  adminToken = await login(admin.username);
  operatorToken = await login(other.username);
});

after(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  await owner`DELETE FROM scenarios WHERE scenario_id LIKE 'CREATE-TEST-%'`;
  await owner`DELETE FROM operating_patterns WHERE normal_line = 'M1' AND route_code = 'CREATE-TEST'`;
  await owner`DELETE FROM track_segments WHERE station_a_id IN (SELECT id FROM stations WHERE code LIKE 'CREATE-%') OR station_b_id IN (SELECT id FROM stations WHERE code LIKE 'CREATE-%')`;
  await owner`DELETE FROM stations WHERE code LIKE 'CREATE-%'`;
  await getDatabase().end();
  await closeOwnerDatabase();
});

test("scenario creation requires an authenticated admin", async () => {
  assert.equal((await post(request("CREATE-TEST-NOAUTH"))).status, 401);
  assert.equal(
    (await post(request("CREATE-TEST-OPERATOR"), operatorToken)).status,
    403,
  );
  assert.equal((await post({}, operatorToken)).status, 403);
});

test("an admin creates a scenario with ordered stops, staffing, tasks, and confirmed coverage", async () => {
  const response = await post(request("CREATE-TEST-VALID"), adminToken);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { scenarioId: "CREATE-TEST-VALID" });
  const get = await fetch(`${baseUrl}/api/v1/scenarios/CREATE-TEST-VALID`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(get.status, 200);
  const scenario = await get.json();
  assert.equal(scenario.currentVersion, "1.0");
  assert.equal(scenario.versions[0].operatingPlan.patterns[0].color, "#724fa3");
  assert.deepEqual(
    scenario.versions[0].operatingPlan.patterns[0].route.map(
      (stop: { station: string }) => stop.station,
    ),
    ["CREATE-A", "CREATE-B"],
  );
  assert.equal(scenario.versions[0].stationRequirements[0].minimumStaffing, 2);
  assert.deepEqual(
    scenario.versions[0].stationRequirements[0].activeDuring.sort(
      (a: { startTime: string }, b: { startTime: string }) =>
        a.startTime.localeCompare(b.startTime),
    ),
    [
      { dayPattern: "MON-THU", startTime: "07:00", endTime: "09:00" },
      { dayPattern: "MON-THU", startTime: "14:00", endTime: "18:00" },
    ],
  );
  assert.deepEqual(
    scenario.versions[0].stationRequirements[0].actions.map(
      (action: { instruction: string }) => action.instruction,
    ),
    ["Stop escalator", "Inform passengers"],
  );
  assert.deepEqual(scenario.covers, [
    { trackNumber: 2, stationA: "CREATE-A", stationB: "CREATE-B" },
  ]);
  assert.equal(
    (await post(request("CREATE-TEST-VALID"), adminToken)).status,
    409,
  );
});

test("a route can pass through a station without stopping", async () => {
  const body = request("CREATE-TEST-SKIP");
  body.patterns[0].stops = ["CREATE-A", "CREATE-C"];
  body.coveredSegmentIds = [];
  assert.equal((await post(body, adminToken)).status, 201);
  const get = await fetch(`${baseUrl}/api/v1/scenarios/CREATE-TEST-SKIP`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const scenario = await get.json();
  assert.deepEqual(
    scenario.versions[0].operatingPlan.patterns[0].route.map(
      (stop: { station: string }) => stop.station,
    ),
    ["CREATE-A", "CREATE-C"],
  );
  const blocked = request("CREATE-TEST-SKIP-BLOCKED");
  blocked.patterns[0].stops = ["CREATE-A", "CREATE-C"];
  blocked.coveredSegmentIds = [usedId];
  assert.equal((await post(blocked, adminToken)).status, 400);
});

test("creation notifies operators in the scenario's line group", async () => {
  const sent: { room: string; event: string }[] = [];
  const previous = app.locals.io;
  app.locals.io = {
    to: (room: string) => ({
      emit: (event: string) => sent.push({ room, event }),
    }),
  };
  try {
    const response = await post(request("CREATE-TEST-NOTIFY"), adminToken);
    assert.equal(response.status, 201);
    assert.deepEqual(sent, [
      { room: "OPERATOR:M1_M2", event: "scenarios-changed" },
    ]);
  } finally {
    app.locals.io = previous;
  }
});

test("a pattern must include a valid colour", async () => {
  const missing = request("CREATE-TEST-NO-COLOR");
  const invalid = request("CREATE-TEST-BAD-COLOR");
  invalid.patterns[0].color = "red";
  assert.equal(
    (
      await post(
        {
          ...missing,
          patterns: [{ ...missing.patterns[0], color: undefined }],
        },
        adminToken,
      )
    ).status,
    400,
  );
  assert.equal((await post(invalid, adminToken)).status, 400);
});

test("invalid network references and covered tracks used by a pattern are rejected", async () => {
  const invalid = request("CREATE-TEST-BAD-TRACK");
  invalid.coveredSegmentIds = [usedId];
  assert.equal((await post(invalid, adminToken)).status, 400);
  const equalTimes = request("CREATE-TEST-BAD-TIME");
  equalTimes.stationRequirements[0].activeDuring[0].endTime = "07:00";
  assert.equal((await post(equalTimes, adminToken)).status, 400);
  const unknown = request("CREATE-TEST-BAD-STATION");
  unknown.stationRequirements[0].station = "UNKNOWN";
  assert.equal((await post(unknown, adminToken)).status, 400);
  assert.equal(
    (
      await owner`SELECT 1 FROM scenarios WHERE scenario_id IN ('CREATE-TEST-BAD-TRACK', 'CREATE-TEST-BAD-STATION')`
    ).length,
    0,
  );
});

test("a database error rolls back the entire scenario", async () => {
  await owner`ALTER TABLE actions ADD CONSTRAINT create_test_fail CHECK (instruction <> 'CREATE-TEST-FAIL')`;
  try {
    const failing = request("CREATE-TEST-ROLLBACK");
    failing.stationRequirements[0].actions = ["CREATE-TEST-FAIL"];
    assert.equal((await post(failing, adminToken)).status, 500);
    assert.equal(
      (
        await owner`SELECT 1 FROM scenarios WHERE scenario_id = 'CREATE-TEST-ROLLBACK'`
      ).length,
      0,
    );
  } finally {
    await owner`ALTER TABLE actions DROP CONSTRAINT create_test_fail`;
  }
});

test("a covered track beyond a terminus cannot be used for its inferred turnback", async () => {
  const addedStations: string[] = [];
  const addedSegments: number[] = [];
  let patternId: number | undefined;
  try {
    for (const code of ["NEL", "MOP"]) {
      const inserted = await owner<
        { id: number }[]
      >`INSERT INTO stations (code, name) VALUES (${code}, ${code}) ON CONFLICT (code) DO NOTHING RETURNING id`;
      if (inserted.length) addedStations.push(code);
    }
    for (const [a, b] of [
      ["NEL", "MOP"],
      ["MOP", "CREATE-A"],
    ]) {
      for (const track of [1, 2]) {
        const inserted = await owner<{ id: number }[]>`
          INSERT INTO track_segments (track_number, station_a_id, station_b_id)
          SELECT ${track}, a.id, b.id FROM stations a, stations b WHERE a.code = ${a} AND b.code = ${b}
          ON CONFLICT DO NOTHING RETURNING id
        `;
        if (inserted[0]) addedSegments.push(inserted[0].id);
      }
    }
    const [pattern] = await owner<{ id: number }[]>`
      INSERT INTO operating_patterns (normal_line, operation_type, route_code, track_number, maximum_trains, did, color)
      VALUES ('M3', 'ROUNDTRIP', 'CREATE-TURNBACK', 12, 2, 'TEST', '#008D40') RETURNING id
    `;
    patternId = pattern.id;
    for (const [index, code] of ["NEL", "MOP", "CREATE-A"].entries()) {
      await owner`INSERT INTO line_stops (operating_pattern_id, station_id, sequence) SELECT ${pattern.id}, id, ${index + 1} FROM stations WHERE code = ${code}`;
    }
    const [tail] = await owner<{ id: number }[]>`
      SELECT t.id FROM track_segments t JOIN stations a ON a.id = t.station_a_id JOIN stations b ON b.id = t.station_b_id
      WHERE t.track_number = 1 AND ((a.code = 'NEL' AND b.code = 'MOP') OR (a.code = 'MOP' AND b.code = 'NEL')) LIMIT 1
    `;
    const body = {
      ...request("CREATE-TEST-TURNBACK"),
      lineGroup: "M3_M4",
      patterns: [
        {
          operationType: "ROUNDTRIP",
          trackNumber: 12,
          did: "D",
          color: "#724fa3",
          maximumTrains: 2,
          stops: ["MOP", "CREATE-A"],
        },
      ],
      stationRequirements: [],
      coveredSegmentIds: [tail.id],
    };
    assert.equal((await post(body, adminToken)).status, 400);
    assert.equal(
      (await post({ ...body, coveredSegmentIds: [] }, adminToken)).status,
      201,
    );
    const response = await fetch(
      `${baseUrl}/api/v1/scenarios/CREATE-TEST-TURNBACK`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const scenario = await response.json();
    assert.deepEqual(
      scenario.versions[0].operatingPlan.patterns[0].route.map(
        (stop: { station: string }) => stop.station,
      ),
      ["MOP", "CREATE-A"],
    );
  } finally {
    await owner`DELETE FROM scenarios WHERE scenario_id = 'CREATE-TEST-TURNBACK'`;
    if (patternId)
      await owner`DELETE FROM operating_patterns WHERE id = ${patternId}`;
    for (const id of addedSegments)
      await owner`DELETE FROM track_segments WHERE id = ${id}`;
    for (const code of addedStations)
      await owner`DELETE FROM stations WHERE code = ${code}`;
  }
});
