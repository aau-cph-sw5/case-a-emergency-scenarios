import { describe, expect, it } from "@jest/globals";
import { routeConnections } from "../../shared/scenario/route-connections";

describe("routeConnections", () => {
  it("sorts stops by sequence and connects adjacent stations", () => {
    const route = [
      { sequence: 3, station: "C" },
      { sequence: 1, station: "A" },
      { sequence: 2, station: "B" },
    ];

    expect(routeConnections(route)).toEqual([
      ["A", "B"],
      ["B", "C"],
    ]);
    expect(route.map(({ station }) => station)).toEqual(["C", "A", "B"]);
  });

  it("uses the same fallback sequence for stops without a number", () => {
    expect(
      routeConnections([
        { sequence: 2, station: "B" },
        { station: "A" },
        { sequence: "1", station: "C" },
      ]),
    ).toEqual([
      ["A", "C"],
      ["C", "B"],
    ]);
  });

  it("skips connections with a missing station", () => {
    expect(
      routeConnections([
        { sequence: 1, station: "A" },
        { sequence: 2 },
        { sequence: 3, station: "C" },
        { sequence: 4, station: "D" },
      ]),
    ).toEqual([["C", "D"]]);
  });
});
