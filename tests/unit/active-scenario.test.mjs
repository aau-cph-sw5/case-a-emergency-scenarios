import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HttpError } from "../../shared/api/http.ts";
import {
  isScenarioState,
  loadActiveScenario,
} from "../../shared/scenario/active-scenario.ts";

const API = "http://localhost:4010";
const fixture = (path) =>
  JSON.parse(
    readFileSync(new URL(`../../fixtures/v1/${path}`, import.meta.url)),
  );

const activeState = fixture("scenario-state.json");
const scenario = fixture("scenarios/DEMO-001.json");

// Answers each URL with its own status and body.
function mockFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const [status, body] = routes[url.slice(API.length)] ?? [404, {}];
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    };
  };
  return { fetchImpl, calls };
}

test("the scenario-state fixture passes the type guard", () => {
  assert.equal(isScenarioState(activeState), true);
});

test("loads the state and the scenario when a scenario is active", async () => {
  const { fetchImpl, calls } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    "/api/v1/scenarios/DEMO-001": [200, scenario],
  });

  const result = await loadActiveScenario(API, "abc", fetchImpl);

  assert.deepEqual(result, { active: true, state: activeState, scenario });
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.init.headers.Authorization, "Bearer abc");
  }
});

test("fetches nothing more when no scenario is active", async () => {
  const { fetchImpl, calls } = mockFetch({
    "/api/v1/scenario-state": [200, { ...activeState, status: "CLOSED" }],
  });

  assert.deepEqual(await loadActiveScenario(API, "abc", fetchImpl), {
    active: false,
  });
  assert.equal(calls.length, 1);
});

test("throws with the status when the token is refused", async () => {
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [401, { error: { code: "E0001" } }],
  });

  await assert.rejects(
    loadActiveScenario(API, "expired", fetchImpl),
    (error) => error instanceof HttpError && error.status === 401,
  );
});

test("rejects a scenario whose station requirement is malformed", async () => {
  const broken = structuredClone(scenario);
  broken.versions[0].stationRequirements[0].actions = {};
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    "/api/v1/scenarios/DEMO-001": [200, broken],
  });

  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    /unexpected format/,
  );
});

test("rejects a scenario-state in an unexpected format", async () => {
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [200, { status: "ACTIVE" }],
  });

  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    /unexpected format/,
  );
});
