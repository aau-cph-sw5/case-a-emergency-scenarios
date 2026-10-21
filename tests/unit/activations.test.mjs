import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchActiveActivations } from "../../web/src/activations.ts";

const signal = new AbortController().signal;
const respondWith =
  (body, status = 200) =>
  async () => ({ ok: status < 400, status, json: async () => body });
const active = {
  scenarioId: "DEMO-001",
  status: "ACTIVE",
  actor: "u1",
  startedAt: "2026-01-01T00:00:00Z",
};

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
