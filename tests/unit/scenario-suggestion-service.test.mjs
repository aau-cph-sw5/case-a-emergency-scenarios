import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDocuments,
  suggestForOperator,
} from "../../src/services/scenario-suggestion-service.ts";

// Real stations on M1/M2, with names in lowercase as stations.json stores
// them. The scenarios are invented.
const stations = [
  { code: "KN", name: "nørreport" },
  { code: "KGN", name: "kongens nytorv" },
  { code: "KHC", name: "christianshavn" },
];

function scenario(scenarioId, name, covers) {
  return {
    scenarioId,
    name,
    lineGroup: "M1_M2",
    currentVersion: "1",
    covers,
    versions: [],
  };
}

test("turns covered station names into codes and adds the names", () => {
  const [doc] = buildDocuments(
    [
      scenario("TEST-1", "Strømsvigt", [
        {
          trackNumber: 1,
          stationA: "kongens nytorv",
          stationB: "christianshavn",
        },
      ]),
    ],
    stations,
  );
  assert.deepEqual(doc, {
    scenarioId: "TEST-1",
    text: "Strømsvigt KGN KHC spor 1 kongens nytorv christianshavn",
  });
});

test("also accepts codes in the covered segments", () => {
  const fromCodes = buildDocuments(
    [
      scenario("TEST-1", "Strømsvigt", [
        { trackNumber: 1, stationA: "KGN", stationB: "KHC" },
      ]),
    ],
    stations,
  );
  const fromNames = buildDocuments(
    [
      scenario("TEST-1", "Strømsvigt", [
        {
          trackNumber: 1,
          stationA: "kongens nytorv",
          stationB: "christianshavn",
        },
      ]),
    ],
    stations,
  );
  assert.deepEqual(fromCodes, fromNames);
});

test("names each station once across several segments", () => {
  const [doc] = buildDocuments(
    [
      scenario("TEST-2", "Signalfejl", [
        { trackNumber: 1, stationA: "nørreport", stationB: "kongens nytorv" },
        {
          trackNumber: 1,
          stationA: "kongens nytorv",
          stationB: "christianshavn",
        },
        { trackNumber: 2, stationA: "nørreport", stationB: "kongens nytorv" },
      ]),
    ],
    stations,
  );
  assert.equal(
    doc.text,
    "Signalfejl KN KGN KHC spor 1 spor 2 nørreport kongens nytorv christianshavn",
  );
});

test("keeps a station that isn't in the station list as it is", () => {
  const [doc] = buildDocuments(
    [
      scenario("TEST-3", "Sporskifte", [
        { trackNumber: 2, stationA: "nørreport", stationB: "ukendt" },
      ]),
    ],
    stations,
  );
  assert.equal(doc.text, "Sporskifte KN ukendt spor 2 nørreport");
});

test("a scenario without covered segments is searched by its name only", () => {
  const [doc] = buildDocuments([scenario("TEST-4", "Brand", [])], stations);
  assert.deepEqual(doc, { scenarioId: "TEST-4", text: "Brand" });
});

test("gives one document per scenario, in the same order", () => {
  const docs = buildDocuments(
    [scenario("B", "Brand", []), scenario("A", "Strømsvigt", [])],
    stations,
  );
  assert.deepEqual(
    docs.map((doc) => doc.scenarioId),
    ["B", "A"],
  );
});

// Stand-ins for the database: invented scenarios on M1/M2, covered stations
// by name as getAllScenarios gives them. Records the line group it was asked for.
function fakeSources() {
  const asked = [];
  return {
    asked,
    getAllScenarios: async (lineGroup) => {
      asked.push(lineGroup);
      return [
        scenario("TEST-KN-KGN-1", "Enkeltsporsdrift", [
          { trackNumber: 1, stationA: "nørreport", stationB: "kongens nytorv" },
        ]),
        scenario("TEST-KGN-KHC-1", "Enkeltsporsdrift", [
          {
            trackNumber: 1,
            stationA: "kongens nytorv",
            stationB: "christianshavn",
          },
        ]),
        scenario("TEST-KGN-KHC-2", "Enkeltsporsdrift", [
          {
            trackNumber: 2,
            stationA: "kongens nytorv",
            stationB: "christianshavn",
          },
        ]),
      ];
    },
    getStations: async () => stations,
  };
}

test("suggests the scenario for the described segment and track first", async () => {
  const result = await suggestForOperator(
    "M1_M2",
    "Signalfejl mellem Kongens Nytorv og Christianshavn spor 2",
    fakeSources(),
  );
  assert.equal(result.status, "CONFIDENT");
  assert.equal(result.candidates[0].scenarioId, "TEST-KGN-KHC-2");
});

test("recognises station codes in the description too", async () => {
  const result = await suggestForOperator(
    "M1_M2",
    "Tog holder stille mellem KN og KGN på spor 1",
    fakeSources(),
  );
  assert.equal(result.status, "CONFIDENT");
  assert.equal(result.candidates[0].scenarioId, "TEST-KN-KGN-1");
});

test("says no scenario fits when the description names no place", async () => {
  const result = await suggestForOperator(
    "M1_M2",
    "Passager med akut sygdom i toget",
    fakeSources(),
  );
  assert.deepEqual(result, { status: "NO_CONFIDENT_CANDIDATE" });
});

test("only asks for the operator's own line group", async () => {
  const sources = fakeSources();
  await suggestForOperator("M3_M4", "Signalfejl ved Nørreport", sources);
  assert.deepEqual(sources.asked, ["M3_M4"]);
});
