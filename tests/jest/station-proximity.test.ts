import { describe, expect, it } from "@jest/globals";
import {
  orderByProximity,
  type StopPosition,
} from "../../mobile/src/data/station-proximity";

const positions: Record<string, StopPosition> = {
  "Station A": { line: "M1", sequence: 1 },
  "Station B": { line: "M1", sequence: 2 },
  "Station C": { line: "M1", sequence: 3 },
  "Station F": { line: "M2", sequence: 1 },
};

describe("orderByProximity", () => {
  it("keeps the scenario's order when there is no last position", () => {
    expect(
      orderByProximity(
        ["Station C", "Station A", "Station B"],
        null,
        positions,
      ),
    ).toEqual(["Station C", "Station A", "Station B"]);
  });

  it("puts the nearest stations on the same line first", () => {
    expect(
      orderByProximity(
        ["Station A", "Station B", "Station C"],
        "Station C",
        positions,
      ),
    ).toEqual(["Station C", "Station B", "Station A"]);
  });

  it("keeps the scenario's order between stations at the same distance", () => {
    expect(
      orderByProximity(
        ["Station C", "Station A", "Station B"],
        "Station B",
        positions,
      ),
    ).toEqual(["Station B", "Station C", "Station A"]);
  });

  it("puts stations on another line, or unknown ones, last in scenario order", () => {
    expect(
      orderByProximity(
        ["Station Z", "Station F", "Station B", "Station A"],
        "Station A",
        positions,
      ),
    ).toEqual(["Station A", "Station B", "Station Z", "Station F"]);
  });

  it("does not change the list it is given", () => {
    const stations = ["Station B", "Station A"];
    orderByProximity(stations, "Station A", positions);
    expect(stations).toEqual(["Station B", "Station A"]);
  });
});
