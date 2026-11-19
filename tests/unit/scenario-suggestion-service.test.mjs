import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDocuments } from "../../src/services/scenario-suggestion-service.ts";

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
