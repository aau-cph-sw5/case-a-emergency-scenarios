import test, { after } from "node:test";
import assert from "node:assert/strict";
import type { Db } from "../../src/db/client.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  inRolledBackTransaction,
} from "./helpers.js";

const owner = getOwnerDatabase();
after(() => closeOwnerDatabase());

async function network(tx: Db) {
  const stations = await tx<{ id: number }[]>`
    INSERT INTO stations (code, name) VALUES
      ('SCHEMA-TEST-A', 'A'), ('SCHEMA-TEST-B', 'B'), ('SCHEMA-TEST-C', 'C')
    RETURNING id
  `;
  const [a, b, c] = stations.map((station) => station.id);
  const tracks = await tx<{ id: number }[]>`
    INSERT INTO track_segments (track_number, station_a_id, station_b_id)
    VALUES (1, ${a}, ${b}), (2, ${a}, ${b}), (1, ${b}, ${c})
    RETURNING id
  `;
  return {
    a,
    b,
    c,
    track1: tracks[0].id,
    track2: tracks[1].id,
    other1: tracks[2].id,
  };
}

function rejected(
  tx: Db,
  query: (db: Db) => PromiseLike<unknown>,
  code: string,
) {
  return assert.rejects(
    tx.savepoint((sp) => query(sp as unknown as Db)),
    (error: unknown) => (error as { code?: string }).code === code,
  );
}

test("crossovers connect different tracks and cannot be duplicated in reverse", () =>
  inRolledBackTransaction(async (tx) => {
    const { a, b, c, track1, track2, other1 } = await network(tx);

    // The application may create crossovers even though it cannot update tracks.
    await tx.savepoint(async (sp) => {
      await sp`SET LOCAL ROLE metro_app`;
      await sp`
        INSERT INTO crossovers (from_track_segment_id, from_position, to_track_segment_id, to_position)
        VALUES (${track1}, 0.3, ${track2}, 0.7)
      `;
      await sp`RESET ROLE`;
    });
    await tx`
      INSERT INTO crossovers (from_track_segment_id, from_position, to_track_segment_id, to_position)
      VALUES (${track1}, 0.7, ${track2}, 0.3)
    `;

    await rejected(
      tx,
      (db) => db`
      INSERT INTO crossovers (from_track_segment_id, from_position, to_track_segment_id, to_position)
      VALUES (${track2}, 0.7, ${track1}, 0.3)
    `,
      "23505",
    );
    await rejected(
      tx,
      (db) => db`
      INSERT INTO crossovers (from_track_segment_id, from_position, to_track_segment_id, to_position)
      VALUES (${track1}, 0.5, ${other1}, 0.5)
    `,
      "23514",
    );
    await rejected(
      tx,
      (db) => db`
      UPDATE track_segments SET track_number = 1 WHERE id = ${track2}
    `,
      "23514",
    );
    await rejected(
      tx,
      (db) => db`
        UPDATE track_segments SET station_a_id = ${c} WHERE id = ${track2}
      `,
      "23514",
    );
    await rejected(
      tx,
      (db) => db`
        UPDATE track_segments SET station_a_id = ${b}, station_b_id = ${a}
        WHERE id = ${track2}
      `,
      "23514",
    );
    // Assigning the same endpoints is harmless and remains allowed.
    await tx`UPDATE track_segments SET station_a_id = ${a}, station_b_id = ${b} WHERE id = ${track2}`;
  }, owner));

test("scenario coverage identifies exactly one segment or crossover", () =>
  inRolledBackTransaction(async (tx) => {
    const { track1, track2 } = await network(tx);
    const [crossover] = await tx<{ id: number }[]>`
      INSERT INTO crossovers (from_track_segment_id, from_position, to_track_segment_id, to_position)
      VALUES (${track1}, 0.3, ${track2}, 0.7) RETURNING id
    `;
    await tx`INSERT INTO scenarios (scenario_id, name, line_group) VALUES ('SCHEMA-TEST', 'Test', 'M1_M2')`;
    await tx`INSERT INTO scenario_covers (scenario_id, track_segment_id) VALUES ('SCHEMA-TEST', ${track1})`;
    await tx`INSERT INTO scenario_covers (scenario_id, crossover_id) VALUES ('SCHEMA-TEST', ${crossover.id})`;
    await rejected(
      tx,
      (db) =>
        db`INSERT INTO scenario_covers (scenario_id) VALUES ('SCHEMA-TEST')`,
      "23514",
    );
    await rejected(
      tx,
      (db) => db`
      INSERT INTO scenario_covers (scenario_id, track_segment_id, crossover_id)
      VALUES ('SCHEMA-TEST', ${track1}, ${crossover.id})
    `,
      "23514",
    );
    await rejected(
      tx,
      (db) => db`
      INSERT INTO scenario_covers (scenario_id, crossover_id) VALUES ('SCHEMA-TEST', ${crossover.id})
    `,
      "23505",
    );
  }, owner));

test("a pattern belongs to either a normal line or a scenario version", () =>
  inRolledBackTransaction(async (tx) => {
    await tx`INSERT INTO scenarios (scenario_id, name, line_group) VALUES ('SCHEMA-TEST', 'Test', 'M1_M2')`;
    const [version] = await tx<{ id: number }[]>`
      INSERT INTO scenario_versions (scenario_id, version, revision)
      VALUES ('SCHEMA-TEST', '1', 'Test') RETURNING id
    `;
    await tx`
      INSERT INTO operating_patterns (normal_line, operation_type, route_code, track_number, maximum_trains, did)
      VALUES ('M1', 'ROUNDTRIP', 'NORMAL', 12, 1, '1')
    `;
    await tx`
      INSERT INTO operating_patterns (scenario_version_id, operation_type, route_code, track_number, maximum_trains, did)
      VALUES (${version.id}, 'PENDULUM', 'SCENARIO', 1, 1, '1')
    `;
    await rejected(
      tx,
      (db) => db`
      INSERT INTO operating_patterns (operation_type, route_code, track_number, maximum_trains, did)
      VALUES ('PENDULUM', 'NO-OWNER', 1, 1, '1')
    `,
      "23514",
    );
    await rejected(
      tx,
      (db) => db`
      INSERT INTO operating_patterns (scenario_version_id, normal_line, operation_type, route_code, track_number, maximum_trains, did)
      VALUES (${version.id}, 'M1', 'PENDULUM', 'TWO-OWNERS', 1, 1, '1')
    `,
      "23514",
    );
  }, owner));

test("schematic positions reference existing network elements", () =>
  inRolledBackTransaction(async (tx) => {
    const { a, track1, track2 } = await network(tx);
    const [crossover] = await tx<{ id: number }[]>`
      INSERT INTO crossovers (from_track_segment_id, from_position, to_track_segment_id, to_position)
      VALUES (${track1}, 0.3, ${track2}, 0.7) RETURNING id
    `;
    await tx`INSERT INTO station_map_positions (station_id, x, y) VALUES (${a}, 1.25, 2.5)`;
    await tx`INSERT INTO crossover_map_positions (crossover_id, x, y) VALUES (${crossover.id}, 2, 3)`;
    await rejected(
      tx,
      (db) => db`
      INSERT INTO station_map_positions (station_id, x, y) VALUES (${a}, 2, 3)
    `,
      "23505",
    );
  }, owner));
