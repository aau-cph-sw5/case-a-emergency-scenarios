import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { postJson } from "../../web/src/get-json.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Records the request and answers 201 with an empty object.
function recordRequest() {
  const sent = {};
  globalThis.fetch = async (path, init) => {
    sent.path = path;
    sent.init = init;
    return new Response("{}", { status: 201 });
  };
  return sent;
}

const anything = (data) => typeof data === "object";

test("without a body nothing is sent and no content type is set", async () => {
  const sent = recordRequest();

  await postJson("/api/v1/scenarios/DEMO-001/activate", "abc", anything);

  assert.equal(sent.init.method, "POST");
  assert.equal(sent.init.body, undefined);
  assert.deepEqual(sent.init.headers, { Authorization: "Bearer abc" });
});

test("a body is sent as JSON, as a switch sends replaces (MET-A-009)", async () => {
  const sent = recordRequest();

  await postJson("/api/v1/scenarios/DEMO-002/activate", "abc", anything, {
    replaces: "ACT-DEMO-001-1",
  });

  assert.deepEqual(JSON.parse(sent.init.body), { replaces: "ACT-DEMO-001-1" });
  assert.equal(sent.init.headers["Content-Type"], "application/json");
  assert.equal(sent.init.headers.Authorization, "Bearer abc");
});
