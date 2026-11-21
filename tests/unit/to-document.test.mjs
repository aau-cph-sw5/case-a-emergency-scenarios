import { test } from "node:test";
import assert from "node:assert/strict";
import { toDocument } from "../../src/services/scenario-suggestion/to-document.ts";

// An invented scenario with every field filled in. The fields that must be
// left out use words that appear nowhere else, so their absence is easy to check.
const scenario = {
  scenarioId: "DEMO-A",
  name: "Strømsvigt Testby",
  lineGroup: "M3_M4",
  currentVersion: "1.0",
  covers: [
    { trackNumber: 1, stationA: "TBY", stationB: "PLB" },
    { trackNumber: 2, stationA: "TBY", stationB: "PLB" },
  ],
  versions: [
    {
      version: "1.0",
      revision: "1",
      operatingPlan: {
        name: "Pendul_Planby",
        patterns: [
          {
            operationType: "PENDULUM",
            routeCode: "RUTEKODE",
            trackNumber: 1,
            maximumTrains: 4,
            did: "DIDKODE",
            description: "pendulbeskrivelse",
            route: [{ sequence: 1, station: "RUTESTATION" }],
          },
        ],
      },
      stationRequirements: [
        {
          station: "KRAVSTATION",
          placement: "perron",
          minimumStaffing: 2,
          actions: [{ sequence: 1, instruction: "personaleinstruks" }],
        },
      ],
      passengerInformation: [
        { channel: "PA", language: "da", message: "passagerbesked" },
        { channel: "PA", language: "en", message: "passenger message" },
      ],
    },
  ],
};

const stationNames = ["Testby", "Planby"];

test("uses the scenario id", () => {
  assert.equal(toDocument(scenario, stationNames).scenarioId, "DEMO-A");
});

test("includes the name, the station codes, the tracks and the station names once each", () => {
  // The scenario covers both tracks between TBY and PLB, so the stations are
  // in two segments but appear once.
  assert.equal(
    toDocument(scenario, stationNames).text,
    "Strømsvigt Testby TBY PLB spor 1 spor 2 Testby Planby",
  );
});

test("lists a station shared by neighbouring segments once", () => {
  const inARow = {
    ...scenario,
    covers: [
      { trackNumber: 1, stationA: "TBY", stationB: "PLB" },
      { trackNumber: 1, stationA: "PLB", stationB: "MBY" },
    ],
  };

  assert.equal(
    toDocument(inARow, ["Testby", "Planby", "Planby", "Midtby"]).text,
    "Strømsvigt Testby TBY PLB MBY spor 1 Testby Planby Midtby",
  );
});

test("gives a scenario on both tracks the same location words as one on a single track", () => {
  const oneTrack = {
    ...scenario,
    covers: [{ trackNumber: 1, stationA: "TBY", stationB: "PLB" }],
  };
  const words = (s) => toDocument(s, stationNames).text.split(" ");
  const count = (list, word) => list.filter((w) => w === word).length;

  for (const station of ["TBY", "PLB"]) {
    assert.equal(
      count(words(scenario), station),
      count(words(oneTrack), station),
    );
  }
});

test("leaves out the operating plan, passenger information, routes and staffing", () => {
  const { text } = toDocument(scenario, stationNames);

  for (const excluded of [
    "Pendul",
    "Planby_",
    "pendulbeskrivelse",
    "RUTEKODE",
    "DIDKODE",
    "RUTESTATION",
    "KRAVSTATION",
    "perron",
    "personaleinstruks",
    "passagerbesked",
    "passenger",
  ]) {
    assert.ok(!text.includes(excluded), `text contains "${excluded}"`);
  }
});

test("handles a scenario without covers and without station names", () => {
  const minimal = {
    scenarioId: "DEMO-B",
    name: "Signalfejl",
    lineGroup: "M3_M4",
    currentVersion: "1.0",
    versions: [],
  };

  assert.deepEqual(toDocument(minimal, []), {
    scenarioId: "DEMO-B",
    text: "Signalfejl",
  });
});

test("skips empty station names without leaving double spaces", () => {
  const { text } = toDocument(scenario, ["", "Testby", ""]);

  assert.ok(text.endsWith("spor 2 Testby"), text);
  assert.ok(!text.includes("  "));
});
