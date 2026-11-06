import test from "node:test";
import assert from "node:assert/strict";
import { checkTransition } from "../../src/services/position-report-service.ts";

// The steward's latest report in the activation.
const onTheWay = (station) => ({ station, event: "EN_ROUTE", taskDone: false });
const arrived = (station) => ({ station, event: "ARRIVED", taskDone: false });
const done = (station) => ({ station, event: "EN_ROUTE", taskDone: true });
const cancelled = (station) => ({
  station,
  event: "CANCELLED",
  taskDone: false,
});
const checkedOut = (station) => ({
  station,
  event: "CHECKED_OUT",
  taskDone: false,
});

const cases = [
  // EN_ROUTE, also when event is left out
  ["EN_ROUTE when free", null, "S", {}, "ok"],
  ["EN_ROUTE after a cancel", cancelled("S"), "S", { event: "EN_ROUTE" }, "ok"],
  ["EN_ROUTE after checking out", checkedOut("T"), "S", {}, "ok"],
  [
    "EN_ROUTE to another station while on the way",
    onTheWay("T"),
    "S",
    {},
    "ok",
  ],
  ["EN_ROUTE again while on the way", onTheWay("S"), "S", {}, "repeat"],
  ["EN_ROUTE while arrived there", arrived("S"), "S", {}, "repeat"],
  ["EN_ROUTE while done there", done("S"), "S", {}, "repeat"],
  ["EN_ROUTE while arrived elsewhere", arrived("T"), "S", {}, "invalid"],
  ["EN_ROUTE while done elsewhere", done("T"), "S", {}, "invalid"],
  // ARRIVED
  ["ARRIVED while on the way", onTheWay("S"), "S", { event: "ARRIVED" }, "ok"],
  ["ARRIVED again", arrived("S"), "S", { event: "ARRIVED" }, "repeat"],
  ["ARRIVED when free", null, "S", { event: "ARRIVED" }, "invalid"],
  [
    "ARRIVED at another station",
    onTheWay("T"),
    "S",
    { event: "ARRIVED" },
    "invalid",
  ],
  ["ARRIVED after task done", done("S"), "S", { event: "ARRIVED" }, "invalid"],
  // CANCELLED
  [
    "CANCELLED while on the way",
    onTheWay("S"),
    "S",
    { event: "CANCELLED" },
    "ok",
  ],
  ["CANCELLED again", cancelled("S"), "S", { event: "CANCELLED" }, "repeat"],
  ["CANCELLED when free", null, "S", { event: "CANCELLED" }, "invalid"],
  [
    "CANCELLED after arriving",
    arrived("S"),
    "S",
    { event: "CANCELLED" },
    "invalid",
  ],
  [
    "CANCELLED at another station",
    onTheWay("T"),
    "S",
    { event: "CANCELLED" },
    "invalid",
  ],
  // CHECKED_OUT
  [
    "CHECKED_OUT after arriving",
    arrived("S"),
    "S",
    { event: "CHECKED_OUT" },
    "ok",
  ],
  [
    "CHECKED_OUT after task done",
    done("S"),
    "S",
    { event: "CHECKED_OUT" },
    "ok",
  ],
  [
    "CHECKED_OUT again",
    checkedOut("S"),
    "S",
    { event: "CHECKED_OUT" },
    "repeat",
  ],
  [
    "CHECKED_OUT while on the way",
    onTheWay("S"),
    "S",
    { event: "CHECKED_OUT" },
    "invalid",
  ],
  ["CHECKED_OUT when free", null, "S", { event: "CHECKED_OUT" }, "invalid"],
  [
    "CHECKED_OUT at another station",
    arrived("T"),
    "S",
    { event: "CHECKED_OUT" },
    "invalid",
  ],
  // taskDone
  ["task done while on the way", onTheWay("S"), "S", { taskDone: true }, "ok"],
  ["task done after arriving", arrived("S"), "S", { taskDone: true }, "ok"],
  ["task done again", done("S"), "S", { taskDone: true }, "repeat"],
  ["task done when free", null, "S", { taskDone: true }, "invalid"],
  [
    "task done at another station",
    arrived("T"),
    "S",
    { taskDone: true },
    "invalid",
  ],
  [
    "task done after checking out",
    checkedOut("S"),
    "S",
    { taskDone: true },
    "invalid",
  ],
];

for (const [name, latest, station, next, expected] of cases) {
  test(name, () => {
    assert.equal(checkTransition(latest, station, next), expected);
  });
}
