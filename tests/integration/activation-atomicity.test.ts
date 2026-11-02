import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { getDatabase } from "../../src/db/client.js";
import { findScenario } from "../../src/repositories/scenario-repository.js";
import { listActivations } from "../../src/repositories/fixture-repository.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import {
  activateAndLog,
  standDownAndLog,
  switchAndLog,
} from "../../src/services/activation-service.js";
import { appendEvent } from "../../src/services/incident-log-service.js";
import { seedTestScenarios } from "./helpers.js";

before(() => seedTestScenarios());

after(() => getDatabase().end());

const operator: AuthUser = {
  userId: 1,
  role: "OPERATOR",
  jti: "test-only-jti",
};

const failingWrite = () => Promise.reject(new Error("event write failed"));

async function scenario(scenarioId: string) {
  const found = await findScenario(scenarioId);
  assert.ok(found);
  return found;
}

function stoodDownEvents(activationId: string) {
  return getDatabase()<{ type: string }[]>`
    SELECT type FROM incident_events
    WHERE type = 'SCENARIO_STOOD_DOWN' AND activation_id = ${activationId}
  `;
}

test("an activation whose event cannot be written is taken back", async () => {
  await assert.rejects(
    activateAndLog(
      operator,
      await scenario("DEMO-002"),
      "operator",
      failingWrite,
    ),
    /event write failed/,
  );
  assert.deepEqual(listActivations("ACTIVE"), []);
});

test("a stand-down whose event cannot be written is taken back", async () => {
  const result = await activateAndLog(
    operator,
    await scenario("DEMO-001"),
    "operator",
  );
  assert.equal(result.kind, "ok");
  const { activationId } = listActivations("ACTIVE")[0];

  await assert.rejects(
    standDownAndLog(operator, activationId, failingWrite),
    /event write failed/,
  );

  const [active] = listActivations("ACTIVE");
  assert.equal(active?.activationId, activationId);
  assert.equal(active.endedAt, null);
  assert.equal((await stoodDownEvents(activationId)).length, 0);
});

test("a switch whose second event cannot be written changes nothing", async () => {
  // DEMO-001 is still active from the test above.
  const [outgoing] = listActivations("ACTIVE");
  assert.equal(outgoing?.scenarioId, "DEMO-001");

  // The stand-down event is written; the activation event then fails, so the
  // transaction must take the stand-down event back too.
  let writes = 0;
  const failOnSecond: typeof appendEvent = (tx, user, event) =>
    ++writes === 1
      ? appendEvent(tx, user, event)
      : Promise.reject(new Error("second event write failed"));

  await assert.rejects(
    switchAndLog(
      operator,
      await scenario("DEMO-002"),
      "operator",
      outgoing.activationId,
      failOnSecond,
    ),
    /second event write failed/,
  );

  assert.equal(writes, 2);
  assert.deepEqual(
    listActivations("ACTIVE").map((a) => a.activationId),
    [outgoing.activationId],
  );
  assert.equal(listActivations("ACTIVE")[0].endedAt, null);
  assert.equal(
    listActivations().some((a) => a.scenarioId === "DEMO-002"),
    false,
  );
  assert.equal((await stoodDownEvents(outgoing.activationId)).length, 0);
});
