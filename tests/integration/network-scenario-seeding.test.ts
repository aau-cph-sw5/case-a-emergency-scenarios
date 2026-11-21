import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { seedNetwork, type NetworkSeed } from "../../scripts/seed-network.js";
import { seedScenarios, type Scenario } from "../../scripts/seed-scenarios.js";

test("scenario seeding preserves network stations and creates missing stations", async () => {
  const network: NetworkSeed = {
    stations: [
      { code: "SEED-ORDER-A", name: "Network name A", x: 10, y: 20 },
      { code: "SEED-ORDER-B", name: "Network name B", x: 30, y: 40 },
    ],
    segments: [
      { trackNumber: 1, stationA: "SEED-ORDER-A", stationB: "SEED-ORDER-B" },
    ],
    normalPatterns: [
      {
        line: "M1",
        routeCode: "SEED-ORDER",
        operationType: "PENDULUM",
        trackNumber: 1,
        maximumTrains: 1,
        did: "TEST",
        color: "#008D40",
        stops: ["SEED-ORDER-A", "SEED-ORDER-B"],
      },
    ],
  };
  const scenario: Scenario = {
    scenarioId: "SEED-ORDER-SCENARIO",
    name: "Test scenario",
    lineGroup: "M1_M2",
    currentVersion: "1",
    covers: [
      { trackNumber: 1, stationA: "SEED-ORDER-A", stationB: "SEED-ORDER-B" },
    ],
    versions: [
      {
        version: "1",
        revision: "Test",
        operatingPlan: {
          name: "Test",
          patterns: [
            {
              operationType: "PENDULUM",
              routeCode: "SEED-ORDER",
              trackNumber: 1,
              maximumTrains: 1,
              did: "TEST",
              color: "#e6140f",
              route: [
                { sequence: 1, station: "SEED-ORDER-A" },
                { sequence: 2, station: "SEED-ORDER-B" },
              ],
            },
          ],
        },
        stationRequirements: [
          { station: "SEED-ORDER-C", placement: "Test", minimumStaffing: 1 },
        ],
      },
    ],
  };
  const scenarioStations = [
    { code: "SEED-ORDER-A", name: "Old name A" },
    { code: "SEED-ORDER-B", name: "Old name B" },
    { code: "SEED-ORDER-C", name: "Scenario-only station" },
  ];
  const client = new pg.Client({
    connectionString: process.env.OWNER_DATABASE_URL,
  });
  await client.connect();
  try {
    await seedNetwork(client, network);
    const before = await client.query(
      `SELECT s.id, s.code, s.name, p.x, p.y FROM stations s JOIN station_map_positions p ON p.station_id = s.id WHERE s.code LIKE 'SEED-ORDER-%' ORDER BY s.code`,
    );
    await seedScenarios(client, [scenario], scenarioStations);
    await seedScenarios(client, [scenario], scenarioStations);
    const after = await client.query(
      `SELECT s.id, s.code, s.name, p.x, p.y FROM stations s JOIN station_map_positions p ON p.station_id = s.id WHERE s.code LIKE 'SEED-ORDER-%' ORDER BY s.code`,
    );
    assert.deepEqual(after.rows, before.rows);
    const created = await client.query(
      "SELECT name FROM stations WHERE code = 'SEED-ORDER-C'",
    );
    assert.equal(created.rows[0].name, "Scenario-only station");
    const covered = await client.query(
      `SELECT count(*)::int AS count FROM scenario_covers WHERE scenario_id = 'SEED-ORDER-SCENARIO'`,
    );
    assert.equal(covered.rows[0].count, 1);
  } finally {
    await client.query(
      "DELETE FROM scenarios WHERE scenario_id = 'SEED-ORDER-SCENARIO'",
    );
    await client.query(
      "DELETE FROM operating_patterns WHERE normal_line = 'M1' AND route_code = 'SEED-ORDER'",
    );
    await client.query(
      "DELETE FROM track_segments WHERE station_a_id IN (SELECT id FROM stations WHERE code LIKE 'SEED-ORDER-%') OR station_b_id IN (SELECT id FROM stations WHERE code LIKE 'SEED-ORDER-%')",
    );
    await client.query("DELETE FROM stations WHERE code LIKE 'SEED-ORDER-%'");
    await client.end();
  }
});
