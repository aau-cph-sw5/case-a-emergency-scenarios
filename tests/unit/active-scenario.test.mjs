import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FormatError, HttpError } from "../../shared/api/http.ts";
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
const scenarioUrl = `/api/v1/scenarios/DEMO-001?activationId=${activeState.activationId}`;

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

test("a task-done deployment passes the type guard", () => {
  const taskDone = {
    ...activeState,
    deployments: [{ status: "TASK_DONE", staff: "7", fulfills: "Station B" }],
  };
  assert.equal(isScenarioState(taskDone), true);
});

test("loads the state and the scenario when a scenario is active", async () => {
  const { fetchImpl, calls } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    [scenarioUrl]: [200, scenario],
  });

  const result = await loadActiveScenario(API, "abc", fetchImpl);

  assert.deepEqual(result, { active: true, state: activeState, scenario });
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.init.headers.Authorization, "Bearer abc");
  }
});

test("treats a null answer as no active scenario", async () => {
  const { fetchImpl, calls } = mockFetch({
    "/api/v1/scenario-state": [200, null],
  });

  assert.deepEqual(await loadActiveScenario(API, "abc", fetchImpl), {
    active: false,
  });
  assert.equal(calls.length, 1);
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

test("rechecks the active state when the activation is stood down during a fetch", async () => {
  let stateReads = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith("/api/v1/scenario-state")) {
      stateReads++;
      return {
        ok: true,
        status: 200,
        json: async () => (stateReads === 1 ? activeState : null),
      };
    }
    return { ok: false, status: 404 };
  };
  assert.deepEqual(await loadActiveScenario(API, "abc", fetchImpl), {
    active: false,
  });
  assert.equal(stateReads, 2);
});

test("loads the new activation after a switch during a fetch", async () => {
  let stateReads = 0;
  const nextState = { ...activeState, activationId: 2, scenarioId: "DEMO-002" };
  const nextScenario = fixture("scenarios/DEMO-002.json");
  const fetchImpl = async (url) => {
    if (url.endsWith("/api/v1/scenario-state")) {
      stateReads++;
      return {
        ok: true,
        status: 200,
        json: async () => (stateReads === 1 ? activeState : nextState),
      };
    }
    if (url.includes("activationId=2")) {
      return { ok: true, status: 200, json: async () => nextScenario };
    }
    return { ok: false, status: 404 };
  };
  assert.deepEqual(await loadActiveScenario(API, "abc", fetchImpl), {
    active: true,
    state: nextState,
    scenario: nextScenario,
  });
  assert.equal(stateReads, 2);
});

test("stops retrying if the activation-specific scenario is still missing", async () => {
  let stateReads = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith("/api/v1/scenario-state")) {
      stateReads++;
      return { ok: true, status: 200, json: async () => activeState };
    }
    return { ok: false, status: 404 };
  };
  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    (error) => error instanceof HttpError && error.status === 404,
  );
  assert.equal(stateReads, 2);
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
    [scenarioUrl]: [200, broken],
  });

  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    /unexpected format/,
  );
});

test("accepts a scenario with passenger information", async () => {
  const withInformation = structuredClone(scenario);
  withInformation.versions[0].passengerInformation = [
    { channel: "PA", language: "da", message: "Toget kører ikke." },
  ];
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    [scenarioUrl]: [200, withInformation],
  });

  const result = await loadActiveScenario(API, "abc", fetchImpl);

  assert.deepEqual(result.scenario, withInformation);
});

test("rejects a scenario whose passenger information is malformed", async () => {
  const broken = structuredClone(scenario);
  broken.versions[0].passengerInformation = [
    { channel: "PA", language: "da", message: { text: "Toget kører ikke." } },
  ];
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    [scenarioUrl]: [200, broken],
  });

  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    /unexpected format/,
  );
});

test("rejects a scenario whose id does not match the active one", async () => {
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    [scenarioUrl]: [200, { ...scenario, scenarioId: "DEMO-002" }],
  });

  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    (error) =>
      error instanceof FormatError && /does not match/.test(error.message),
  );
});

test("rejects a scenario without its current version", async () => {
  const { fetchImpl } = mockFetch({
    "/api/v1/scenario-state": [200, activeState],
    [scenarioUrl]: [200, { ...scenario, currentVersion: "99" }],
  });

  await assert.rejects(
    loadActiveScenario(API, "abc", fetchImpl),
    (error) =>
      error instanceof FormatError &&
      /without its current version/.test(error.message),
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
