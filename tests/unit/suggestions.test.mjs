/* eslint-disable n/no-unsupported-features/node-builtins */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchSuggestions } from "../../web/src/suggestions.ts";
import { ApiError } from "../../web/src/get-json.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Records the request and answers with body and status.
function respondWith(body, status = 200) {
  const sent = {};
  globalThis.fetch = async (path, init) => {
    sent.path = path;
    sent.init = init;
    return new Response(JSON.stringify(body), { status });
  };
  return sent;
}

test("parses a confident answer and sends the description as a POST", async () => {
  const answer = {
    status: "CONFIDENT",
    candidates: [{ scenarioId: "S1", score: 0.87 }],
  };
  const sent = respondWith(answer);

  assert.deepEqual(await fetchSuggestions("abc", "signalfejl"), answer);
  assert.equal(sent.path, "/api/v1/scenario-suggestions");
  assert.equal(sent.init.method, "POST");
  assert.deepEqual(JSON.parse(sent.init.body), { description: "signalfejl" });
});

test("parses NO_CONFIDENT_CANDIDATE", async () => {
  respondWith({ status: "NO_CONFIDENT_CANDIDATE" });
  assert.deepEqual(await fetchSuggestions("abc", "x"), {
    status: "NO_CONFIDENT_CANDIDATE",
  });
});

for (const [name, body] of [
  ["unknown status", { status: "MAYBE" }],
  ["no candidates", { status: "CONFIDENT", candidates: [] }],
  [
    "more than 5 candidates",
    {
      status: "CONFIDENT",
      candidates: Array.from({ length: 6 }, (_, i) => ({
        scenarioId: `S${i}`,
        score: 0.5,
      })),
    },
  ],
  [
    "score above 1",
    { status: "CONFIDENT", candidates: [{ scenarioId: "S1", score: 2 }] },
  ],
  [
    "candidate without scenarioId",
    { status: "CONFIDENT", candidates: [{ score: 0.5 }] },
  ],
]) {
  test(`rejects ${name}`, async () => {
    respondWith(body);
    await assert.rejects(fetchSuggestions("abc", "x"), /unexpected format/);
  });
}

test("a 404 becomes an ApiError", async () => {
  respondWith({}, 404);
  await assert.rejects(
    fetchSuggestions("abc", "x"),
    (error) => error instanceof ApiError && error.status === 404,
  );
});
