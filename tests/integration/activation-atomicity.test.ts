import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDatabase } from "../../src/db/client.js";
import { findScenario } from "../../src/repositories/scenario-repository.js";
import { listActivations } from "../../src/repositories/activation-repository.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import {
  activateAndLog,
  standDownAndLog,
  switchAndLog,
} from "../../src/services/activation-service.js";
import { appendEvent } from "../../src/services/incident-log-service.js";
import { seedTestScenarios } from "./helpers.js";

before(async () => {
  const users = await seedTestUsers("atomicity-");
  operator.userId = users.find((user) => user.role === "OPERATOR")!.id;
  await seedTestScenarios();
});

after(() => getDatabase().end());

const operator: AuthUser = {
  userId: 1,
  role: "OPERATOR",
  lineGroup: "M1_M2",
  jti: "test-only-jti",
};

const failingWrite = () => Promise.reject(new Error("event write failed"));

async function scenario(scenarioId: string) {
  const found = await findScenario(scenarioId);
  assert.ok(found);
  return found;
}

function stoodDownEvents(activationId: number) {
  return getDatabase()<{ type: string }[]>`
    SELECT type FROM incident_events
    WHERE type = 'SCENARIO_STOOD_DOWN' AND activation_id = ${String(activationId)}
  `;
}

test("an activation whose event cannot be written is taken back", async () => {
  await assert.rejects(
    activateAndLog(
      operator,
      await scenario("DEMO-001"),
      "operator",
      failingWrite,
    ),
    /event write failed/,
  );
  assert.deepEqual(await listActivations("ACTIVE"), []);
});

test("a stand-down whose event cannot be written is taken back", async () => {
  const result = await activateAndLog(
    operator,
    await scenario("DEMO-001"),
    "operator",
  );
  assert.equal(result.kind, "ok");
  const { activationId } = (await listActivations("ACTIVE"))[0];

  await assert.rejects(
    standDownAndLog(operator, activationId, failingWrite),
    /event write failed/,
  );

  const [active] = await listActivations("ACTIVE");
  assert.equal(active?.activationId, activationId);
  assert.equal(active.endedAt, null);
  assert.equal((await stoodDownEvents(activationId)).length, 0);
});

test("a switch whose second event cannot be written changes nothing", async () => {
  // DEMO-001 is still active from the test above.
  const [outgoing] = await listActivations("ACTIVE");
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
      await scenario("DEMO-003"),
      "operator",
      outgoing.activationId,
      failOnSecond,
    ),
    /second event write failed/,
  );

  assert.equal(writes, 2);
  assert.deepEqual(
    (await listActivations("ACTIVE")).map((a) => a.activationId),
    [outgoing.activationId],
  );
  assert.equal((await listActivations("ACTIVE"))[0].endedAt, null);
  assert.equal(
    (await listActivations()).some((a) => a.scenarioId === "DEMO-003"),
    false,
  );
  assert.equal((await stoodDownEvents(outgoing.activationId)).length, 0);
});

test("an activation made while a stand-down is writing its event waits for it", async () => {
  // DEMO-001 is still active from the tests above.
  const [outgoing] = await listActivations("ACTIVE");
  assert.equal(outgoing?.scenarioId, "DEMO-001");

  // The stand-down's event write fails, but only after the activation below
  // has been started.
  const slowFailingWrite = () =>
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("event write failed")), 50),
    );
  const standDown = standDownAndLog(
    operator,
    outgoing.activationId,
    slowFailingWrite,
  );
  const activation = activateAndLog(
    operator,
    await scenario("DEMO-003"),
    "operator",
  );

  await assert.rejects(standDown, /event write failed/);
  // The stand-down was taken back before the activation ran, so DEMO-001 is
  // still the only active scenario and the activation is refused.
  assert.equal((await activation).kind, "already-active");
  assert.deepEqual(
    (await listActivations("ACTIVE")).map((a) => a.activationId),
    [outgoing.activationId],
  );
});

test("the active activation can be read in a fresh server process", async () => {
  const [expected] = await listActivations("ACTIVE");
  const { stdout } = await promisify(execFile)(process.execPath, [
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    `import { listActivations } from './src/repositories/activation-repository.ts';
     import { getDatabase } from './src/db/client.ts';
     console.log(JSON.stringify(await listActivations('ACTIVE')));
     await getDatabase().end();`,
  ]);
  assert.deepEqual(JSON.parse(stdout), [expected]);
});

test("concurrent activations in one line group allow only one active scenario", async () => {
  const [active] = await listActivations("ACTIVE");
  await standDownAndLog(operator, active.activationId);
  const [first, second] = await Promise.all([
    activateAndLog(operator, await scenario("DEMO-001"), "operator"),
    activateAndLog(operator, await scenario("DEMO-003"), "operator"),
  ]);
  assert.deepEqual([first.kind, second.kind].sort(), ["already-active", "ok"]);
  assert.equal((await listActivations("ACTIVE")).length, 1);
});

test("an activation waiting for a stand-down starts after it closes", async () => {
  const [current] = await listActivations("ACTIVE");
  let signalStarted!: () => void;
  const writeStarted = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const slowWrite: typeof appendEvent = async (tx, user, event) => {
    signalStarted();
    await new Promise((resolve) => setTimeout(resolve, 80));
    return appendEvent(tx, user, event);
  };
  const nextScenario = await scenario(current.scenarioId);
  const closing = standDownAndLog(operator, current.activationId, slowWrite);
  await writeStarted;
  const starting = activateAndLog(operator, nextScenario, "operator");
  const [closed, started] = await Promise.all([closing, starting]);
  assert.equal(closed.kind, "ok");
  assert.equal(started.kind, "ok");
  if (closed.kind === "ok" && started.kind === "ok") {
    assert.ok(
      Date.parse(started.activation.startedAt) >=
        Date.parse(closed.activation.endedAt!),
    );
  }
});

test("concurrent activations in different line groups are both allowed", async () => {
  const m3m4Operator: AuthUser = { ...operator, lineGroup: "M3_M4" };
  for (const active of await listActivations("ACTIVE")) {
    await standDownAndLog(
      active.lineGroup === "M1_M2" ? operator : m3m4Operator,
      active.activationId,
    );
  }
  const [first, second] = await Promise.all([
    activateAndLog(operator, await scenario("DEMO-001"), "operator"),
    activateAndLog(m3m4Operator, await scenario("DEMO-002"), "operator"),
  ]);
  assert.deepEqual([first.kind, second.kind], ["ok", "ok"]);
  assert.deepEqual(
    (await listActivations("ACTIVE")).map((a) => a.lineGroup).sort(),
    ["M1_M2", "M3_M4"],
  );
});
