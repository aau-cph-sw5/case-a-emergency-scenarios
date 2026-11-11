import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkScenarioFiles,
  describeTarget,
  parseSeedJson,
  readDemoData,
  seedConnection,
  validate,
  type Scenario,
} from "../../scripts/seed-scenarios.ts";

const STATIONS = ["VAN", "FL", "LIT", "KN"];
const SHAFTS = ["ØSØ", "GÅB"];
const allowedStations = new Set([...STATIONS, ...SHAFTS]);
const shaftCodes = new Set(SHAFTS);

function scenarioWithRoute(route: object[]): Scenario {
  return {
    scenarioId: "TEST-1",
    lineGroup: "M3_M4",
    name: "Test",
    currentVersion: "1.0",
    covers: [{ trackNumber: 1, stationA: "VAN", stationB: "FL" }],
    versions: [
      {
        version: "1.0",
        revision: "test",
        operatingPlan: {
          name: "plan",
          patterns: [
            {
              operationType: "PENDULUM",
              routeCode: "R",
              trackNumber: 1,
              maximumTrains: 1,
              did: "D",
              route:
                route as Scenario["versions"][0]["operatingPlan"]["patterns"][0]["route"],
            },
          ],
        },
      },
    ],
  };
}

function errorsFor(route: object[]) {
  return validate(
    scenarioWithRoute(route),
    "test.json",
    allowedStations,
    shaftCodes,
  );
}

test("a route of only stations is valid", () => {
  assert.deepEqual(
    errorsFor([
      { sequence: 1, station: "VAN" },
      { sequence: 2, station: "FL" },
    ]),
    [],
  );
});

test("a shaft in the middle of a route is valid", () => {
  assert.deepEqual(
    errorsFor([
      { sequence: 1, station: "VAN" },
      { sequence: 2, shafts: "ØSØ" },
      { sequence: 3, station: "FL" },
    ]),
    [],
  );
});

const DECOMPOSED_GAB = "GÅB".normalize("NFD");

test("decomposed codes are normalised when a seed file is parsed", () => {
  assert.notEqual(DECOMPOSED_GAB, "GÅB");
  const parsed = parseSeedJson<{ shafts: string }>(
    JSON.stringify({ shafts: DECOMPOSED_GAB }),
  );
  assert.equal(parsed.shafts, "GÅB");
});

test("a decomposed shaft code in a route is valid after parsing", () => {
  const scenario = parseSeedJson<Scenario>(
    JSON.stringify(
      scenarioWithRoute([
        { sequence: 1, station: "VAN" },
        { sequence: 2, shafts: DECOMPOSED_GAB },
      ]),
    ),
  );
  assert.deepEqual(
    validate(scenario, "test.json", allowedStations, shaftCodes),
    [],
  );
});

test("a stop with neither station nor shaft is rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, intersec: "ØSØ" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /route\[1\]/);
  assert.match(errors[0], /intersec/); // the stop itself is printed
});

test("a stop with both station and shaft is rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, station: "FL", shafts: "ØSØ" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /route\[1\]/);
});

test("a station code written as a shaft is rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, shafts: "KN" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown shaft/);
});

test("an unknown station is still rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, station: "NOPE" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown station "NOPE"/);
});

// A valid scenario with one station requirement, for the checks below.
function validScenario(): Scenario {
  const scenario = scenarioWithRoute([
    { sequence: 1, station: "VAN" },
    { sequence: 2, station: "FL" },
  ]);
  scenario.versions[0].stationRequirements = [
    {
      station: "VAN",
      placement: "platform",
      minimumStaffing: 1,
      actions: [
        { sequence: 1, instruction: "first" },
        { sequence: 2, instruction: "second" },
      ],
    },
  ];
  return scenario;
}

function validateScenario(scenario: Scenario) {
  return validate(scenario, "test.json", allowedStations, shaftCodes);
}

test("the valid scenario used below has no errors", () => {
  assert.deepEqual(validateScenario(validScenario()), []);
});

test("a scenario without covers is valid", () => {
  const scenario = validScenario();
  delete scenario.covers;
  assert.deepEqual(validateScenario(scenario), []);
});

test("two versions with the same version are rejected", () => {
  const scenario = validScenario();
  scenario.versions.push(structuredClone(scenario.versions[0]));
  const errors = validateScenario(scenario);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^test\.json: version "1\.0" appears more than once/);
});

test("two actions with the same sequence are rejected", () => {
  const scenario = validScenario();
  scenario.versions[0].stationRequirements![0].actions![1].sequence = 1;
  const errors = validateScenario(scenario);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^test\.json: .*stationRequirements\[0\]\.actions/);
  assert.match(errors[0], /sequence 1 is used by more than one action/);
});

test("a negative minimumStaffing is rejected", () => {
  const scenario = validScenario();
  scenario.versions[0].stationRequirements![0].minimumStaffing = -1;
  const errors = validateScenario(scenario);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^test\.json: .*minimumStaffing is -1/);
});

test("a negative maximumTrains is rejected", () => {
  const scenario = validScenario();
  scenario.versions[0].operatingPlan.patterns[0].maximumTrains = -2;
  const errors = validateScenario(scenario);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^test\.json: .*maximumTrains is -2/);
});

function checkFiles(files: { fileName: string; text: string }[]) {
  return checkScenarioFiles(files, allowedStations, shaftCodes);
}

test("an invalid JSON file is named, without its content", () => {
  const good = JSON.stringify(validScenario());
  const { errors } = checkFiles([
    { fileName: "SeedDataScenario_1.json", text: good },
    { fileName: "SeedDataScenario_2.json", text: '{ "name": "secret", }' },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^SeedDataScenario_2\.json: is not valid JSON/);
  assert.doesNotMatch(errors[0], /secret/);
});

test("all files are checked and every problem is reported", () => {
  const broken = validScenario();
  broken.versions[0].operatingPlan.patterns[0].maximumTrains = -1;
  const { errors } = checkFiles([
    { fileName: "SeedDataScenario_1.json", text: "not json" },
    { fileName: "SeedDataScenario_2.json", text: JSON.stringify(broken) },
    {
      fileName: "SeedDataScenario_3.json",
      text: JSON.stringify(validScenario()),
    },
  ]);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /^SeedDataScenario_1\.json: is not valid JSON/);
  assert.match(errors[1], /^SeedDataScenario_2\.json: .*maximumTrains/);
  assert.match(errors[2], /^SeedDataScenario_3\.json: scenarioId "TEST-1"/);
});

test("valid files give their scenarios and no errors", () => {
  const { scenarios, errors } = checkFiles([
    {
      fileName: "SeedDataScenario_1.json",
      text: JSON.stringify(validScenario()),
    },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(scenarios.length, 1);
});

test("the DEMO fixtures load as valid demo data", () => {
  const { scenarios, stationList } = readDemoData();
  assert.deepEqual(
    scenarios.map((s) => s.scenarioId),
    ["DEMO-001", "DEMO-002", "DEMO-003"],
  );
  assert.deepEqual(
    stationList.map((s) => s.code),
    ["A", "B", "C", "D", "E", "F", "G"].map((letter) => `Station ${letter}`),
  );
});

test("without SEED_DATABASE_URL the seed writes to the local database", () => {
  const config = seedConnection({
    POSTGRES_PASSWORD: "pw",
    POSTGRES_PORT: "5433",
  });
  assert.equal(config.host, "localhost");
  assert.equal(config.port, 5433);
  assert.equal(config.database, "metro");
  assert.equal(config.connectionString, undefined);
  assert.equal(describeTarget(config), "localhost:5433/metro");
});

test("SEED_DATABASE_URL picks another database, and its password is not printed", () => {
  const config = seedConnection({
    SEED_DATABASE_URL: "postgresql://owner:s3cret@staging.example:6543/metro",
  });
  assert.equal(
    config.connectionString,
    "postgresql://owner:s3cret@staging.example:6543/metro",
  );
  assert.equal(config.connectionTimeoutMillis, 10_000);
  assert.equal(describeTarget(config), "staging.example:6543/metro");
  assert.doesNotMatch(describeTarget(config), /s3cret|owner/);
});

test("the local database needs POSTGRES_PASSWORD", () => {
  assert.throws(() => seedConnection({}), /POSTGRES_PASSWORD is not set/);
});
