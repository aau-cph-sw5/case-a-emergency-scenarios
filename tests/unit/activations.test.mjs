import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchActiveScenarioIds } from "../../web/src/activations.ts";

const token = "test-token";
// Only the parts of a Response that fetchActiveScenarioIds reads.
const respondWith =
  (body, status = 200) =>
  async () => ({ ok: status < 400, status, json: async () => body });
const signal = new AbortController().signal;

test("returns the ids of the active scenarios", async () => {
  const ids = await fetchActiveScenarioIds(
    token,
    signal,
    respondWith([
      { scenarioId: "DEMO-001", status: "ACTIVE" },
      { scenarioId: "DEMO-003", status: "ACTIVE" },
    ]),
  );
  assert.deepEqual([...ids].sort(), ["DEMO-001", "DEMO-003"]);
});

test("does not mark a closed activation as active", async () => {
  const ids = await fetchActiveScenarioIds(
    token,
    signal,
    respondWith([
      { scenarioId: "DEMO-001", status: "ACTIVE" },
      { scenarioId: "DEMO-002", status: "CLOSED" },
    ]),
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

test("rejects a response that is not a list of activations", async () => {
  await assert.rejects(
    fetchActiveScenarioIds(token, signal, respondWith([{ scenarioId: 1 }])),
    /unexpected format/,
  );
});

// When the activations cannot be loaded, the error is passed on, so the list
// can still work and say that active scenarios could not be shown.
test("reports the status when the server answers with an error", async () => {
  await assert.rejects(
    fetchActiveScenarioIds(token, signal, respondWith({}, 404)),
    /404/,
  );
});
