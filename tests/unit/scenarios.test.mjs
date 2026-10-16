import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchScenarios } from "../../web/src/scenarios.ts";
const token = "test-token";
// Only the parts of a Response that fetchScenarios reads.
const respondWith =
  (body, status = 200) =>
  async () => ({ ok: status < 400, status, json: async () => body });
const signal = new AbortController().signal;

test("returns the scenarios when the response has the expected fields", async () => {
  const list = [
    { scenarioId: "DEMO-001", name: "Synthetic fallback scenario" },
  ];
  assert.deepEqual(
    await fetchScenarios(token, signal, respondWith(list)),
    list,
  );
});

test("rejects a list item without a name", async () => {
  await assert.rejects(
    fetchScenarios(token, signal, respondWith([{ scenarioId: "DEMO-001" }])),
    /unexpected format/,
  );
});

test("rejects a response that is not a list", async () => {
  await assert.rejects(
    fetchScenarios(token, signal, respondWith({ scenarios: [] })),
    /unexpected format/,
  );
});

test("reports the status when the server answers with an error", async () => {
  await assert.rejects(
    fetchScenarios(token, signal, respondWith({}, 500)),
    /500/,
  );
});
