import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchActiveActivations,
  fetchActiveScenarioIds,
} from "../../web/src/activations.ts";

const token = "test-token";
const signal = new AbortController().signal;
// Only the parts of a Response that the fetch functions read.
const respondWith =
  (body, status = 200) =>
  async () => ({ ok: status < 400, status, json: async () => body });
// An activation with the fields that isScenarioState checks.
const activation = (scenarioId, status = "ACTIVE") => ({
  activationId: `ACT-${scenarioId}-1`,
  scenarioId,
  status,
  actor: "u1",
  startedAt: "2026-01-01T00:00:00Z",
  deployments: [],
});
const active = activation("DEMO-001");

test("returns the active activations", async () => {
  assert.deepEqual(
    await fetchActiveActivations("t", signal, respondWith([active])),
    [active],
  );
});

test("rejects an unexpected format", async () => {
  await assert.rejects(
    fetchActiveActivations("t", signal, respondWith([{ scenarioId: 1 }])),
    /unexpected format/,
  );
});

test("rejects a failed request", async () => {
  await assert.rejects(
    fetchActiveActivations("t", signal, respondWith({}, 500)),
    /failed with 500/,
  );
});

test("returns the ids of the active scenarios", async () => {
  const ids = await fetchActiveScenarioIds(
    token,
    signal,
    respondWith([activation("DEMO-001"), activation("DEMO-003")]),
  );
  assert.deepEqual([...ids].sort(), ["DEMO-001", "DEMO-003"]);
});

test("does not mark a closed activation as active", async () => {
  const ids = await fetchActiveScenarioIds(
    token,
    signal,
    respondWith([activation("DEMO-001"), activation("DEMO-002", "CLOSED")]),
  );
  assert.equal(ids.has("DEMO-001"), true);
  assert.equal(ids.has("DEMO-002"), false);
});

test("returns no ids when nothing is active", async () => {
  const ids = await fetchActiveScenarioIds(token, signal, respondWith([]));
  assert.equal(ids.size, 0);
});

test("asks the server only for active activations, with the token", async () => {
  let request;
  await fetchActiveScenarioIds(token, signal, async (url, init) => {
    request = { url, init };
    return { ok: true, status: 200, json: async () => [] };
  });
  assert.equal(request.url, "/api/v1/activations?status=ACTIVE");
  assert.equal(request.init.headers.Authorization, `Bearer ${token}`);
});

// When the activations cannot be loaded, the error is passed on, so the list
// can still work and say that active scenarios could not be shown.
test("passes the error on when the activations cannot be loaded", async () => {
  await assert.rejects(
    fetchActiveScenarioIds(token, signal, respondWith({}, 404)),
    /404/,
  );
});
