import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { seedNetwork, type NetworkSeed } from "../../scripts/seed-network.js";
import { getNetwork } from "../../src/repositories/network-repository.js";
import { getDatabase } from "../../src/db/client.js";
import { validate } from "../../src/validation/contract-validator.js";

after(() => getDatabase().end());

test("network seeding is repeatable and keeps station and segment identities", async () => {
  const data: NetworkSeed = {
    stations: [
      { code: "NETWORK-TEST-A", name: "Test A", x: 10, y: 20 },
      { code: "NETWORK-TEST-B", name: "Test B", x: 30, y: 40 },
    ],
    segments: [
      {
        trackNumber: 1,
        stationA: "NETWORK-TEST-A",
        stationB: "NETWORK-TEST-B",
      },
      {
        trackNumber: 2,
        stationA: "NETWORK-TEST-A",
        stationB: "NETWORK-TEST-B",
      },
    ],
    normalPatterns: [
      {
        line: "M1",
        routeCode: "NETWORK-TEST",
        operationType: "ROUNDTRIP",
        trackNumber: 12,
        maximumTrains: 2,
        did: "TEST",
        stops: ["NETWORK-TEST-A", "NETWORK-TEST-B"],
      },
    ],
  };
  const client = new pg.Client({
    connectionString: process.env.OWNER_DATABASE_URL,
  });
  await client.connect();
  try {
    await seedNetwork(client, data);
    const before = await client.query(
      "SELECT id, station_a_id, station_b_id FROM track_segments WHERE station_a_id = (SELECT id FROM stations WHERE code = $1) ORDER BY track_number",
      ["NETWORK-TEST-A"],
    );
    data.stations[0].x = 15;
    data.segments[0] = {
      ...data.segments[0],
      stationA: "NETWORK-TEST-B",
      stationB: "NETWORK-TEST-A",
    };
    await seedNetwork(client, data);
    const after = await client.query(
      "SELECT id, station_a_id, station_b_id FROM track_segments WHERE station_a_id = (SELECT id FROM stations WHERE code = $1) ORDER BY track_number",
      ["NETWORK-TEST-A"],
    );
    assert.deepEqual(after.rows, before.rows);
    const loaded = await client.query(
      `SELECT p.x, (SELECT count(*)::int FROM operating_patterns WHERE normal_line = 'M1' AND route_code = 'NETWORK-TEST') AS patterns, (SELECT count(*)::int FROM line_stops ls JOIN operating_patterns op ON op.id = ls.operating_pattern_id WHERE op.normal_line = 'M1' AND op.route_code = 'NETWORK-TEST') AS stops FROM station_map_positions p JOIN stations s ON s.id = p.station_id WHERE s.code = $1`,
      ["NETWORK-TEST-A"],
    );
    assert.deepEqual(loaded.rows[0], { x: 15, patterns: 1, stops: 2 });
    // An ambiguous existing pattern aborts the whole seed, including the
    // station-position update that ran before the duplicate was detected.
    await client.query(
      `INSERT INTO operating_patterns (normal_line, route_code, operation_type, track_number, maximum_trains, did)
       VALUES ('M1', 'NETWORK-TEST', 'ROUNDTRIP', 12, 1, 'DUPLICATE')`,
    );
    data.stations[0].x = 99;
    await assert.rejects(
      seedNetwork(client, data),
      /multiple existing patterns/,
    );
    const position = await client.query(
      "SELECT p.x FROM station_map_positions p JOIN stations s ON s.id = p.station_id WHERE s.code = $1",
      ["NETWORK-TEST-A"],
    );
    assert.equal(position.rows[0].x, 15);
    await client.query(
      "DELETE FROM operating_patterns WHERE normal_line = 'M1' AND route_code = 'NETWORK-TEST' AND did = 'DUPLICATE'",
    );
    const response = await getNetwork();
    assert.deepEqual(validate(response, "network.schema.json"), []);
    assert.deepEqual(
      response.normalPatterns.find(
        (pattern) => pattern.routeCode === "NETWORK-TEST",
      )?.stops,
      ["NETWORK-TEST-A", "NETWORK-TEST-B"],
    );
    assert.equal(
      response.stations.find((station) => station.code === "NETWORK-TEST-A")?.x,
      15,
    );
    assert.equal(
      response.segments.filter(
        (segment) => segment.stationA === "NETWORK-TEST-A",
      ).length,
      2,
    );
  } finally {
    await client.query(
      "DELETE FROM operating_patterns WHERE normal_line = 'M1' AND route_code = 'NETWORK-TEST'",
    );
    await client.query(
      "DELETE FROM track_segments WHERE station_a_id IN (SELECT id FROM stations WHERE code LIKE 'NETWORK-TEST-%') OR station_b_id IN (SELECT id FROM stations WHERE code LIKE 'NETWORK-TEST-%')",
    );
    await client.query("DELETE FROM stations WHERE code LIKE 'NETWORK-TEST-%'");
    await client.end();
  }
});
