import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { Circle, Line } from "react-native-svg";
import MapRender from "../../shared/MapRenderer";
import { getLines } from "../../mockData/data";

const colors = { M2: "#00f" };

// SVG text is not reachable by getByText, so the stations are counted by
// their dots.
function drawnStations() {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .map((dot) => [dot.props.cx, dot.props.cy]);
}

describe("MapRender", () => {
  it.each(["M1", "M2"])(
    "shows Nørreport between Forum and Kongens Nytorv on %s",
    (name) => {
      const line = getLines().find((candidate) => candidate.name === name)!;
      expect(line.connections).toEqual(
        expect.arrayContaining([
          ["FOR", "KN"],
          ["KN", "KGN"],
        ]),
      );
      render(
        <MapRender
          lines={[{ ...line, tracks: [1, 2] }]}
          colors={{ [name]: "#00f" }}
        />,
      );
      expect(drawnStations()).toContainEqual([565, 343]);
    },
  );

  it("uses supplied network positions and only draws available tracks", () => {
    render(
      <MapRender
        lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
        colors={colors}
        positions={{ FOR: [1, 2], KN: [3, 4] }}
        ringStations={[]}
        availableSegments={[
          { trackNumber: 1, stationA: "FOR", stationB: "KN" },
        ]}
      />,
    );
    expect(drawnStations()).toEqual(
      expect.arrayContaining([
        [1, 2],
        [3, 4],
      ]),
    );
    expect(screen.UNSAFE_queryAllByType(Line)).toHaveLength(2);
  });

  it("does not draw a line on a track outside that connection's service", () => {
    render(
      <MapRender
        lines={[
          {
            name: "M2",
            tracks: [1, 2],
            connections: [["FOR", "KN"]],
            connectionTracks: { '["FOR","KN"]': [1] },
          },
        ]}
        colors={colors}
        positions={{ FOR: [1, 2], KN: [30, 2] }}
        ringStations={[]}
        availableSegments={[
          { trackNumber: 1, stationA: "FOR", stationB: "KN" },
          { trackNumber: 2, stationA: "FOR", stationB: "KN" },
        ]}
      />,
    );
    expect(screen.UNSAFE_queryAllByType(Line)).toHaveLength(2);
  });

  it("keeps track placement stable when line order is reversed", () => {
    const segments = [
      { trackNumber: 1, stationA: "FOR", stationB: "KN" },
      { trackNumber: 2, stationA: "FOR", stationB: "KN" },
    ];
    const props = {
      colors,
      positions: {
        FOR: [1, 20] as [number, number],
        KN: [31, 20] as [number, number],
      },
      ringStations: [],
      availableSegments: segments,
    };
    const view = render(
      <MapRender
        {...props}
        lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
      />,
    );
    const forward = screen
      .UNSAFE_queryAllByType(Line)
      .map((line) => [
        line.props.x1,
        line.props.y1,
        line.props.x2,
        line.props.y2,
      ]);
    view.rerender(
      <MapRender
        {...props}
        lines={[{ name: "M2", tracks: [1, 2], connections: [["KN", "FOR"]] }]}
      />,
    );
    const reverse = screen
      .UNSAFE_queryAllByType(Line)
      .map((line) => [
        line.props.x1,
        line.props.y1,
        line.props.x2,
        line.props.y2,
      ]);
    expect(reverse).toEqual(forward);
  });

  it("draws a dot for each station of a line", () => {
    render(
      <MapRender
        lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
        colors={colors}
      />,
    );

    expect(drawnStations()).toHaveLength(2);
  });

  it("skips a station the map has no position for and draws the rest", () => {
    render(
      <MapRender
        lines={[
          {
            name: "M2",
            tracks: [1, 2],
            connections: [
              ["FOR", "XYZ"],
              ["KN", "KGN"],
            ],
          },
        ]}
        colors={colors}
      />,
    );

    expect(drawnStations()).toHaveLength(2);
  });

  it("draws marked stations filled, at the same size as the others", () => {
    const lines = [
      {
        name: "M2",
        tracks: [1, 2],
        connections: [["FOR", "KN"]] as [string, string][],
      },
    ];
    const dots = () => screen.UNSAFE_queryAllByType(Circle);
    const fills = () => new Set(dots().map((dot) => dot.props.fill));

    const view = render(<MapRender lines={lines} colors={colors} />);
    expect(fills().size).toBe(1);

    view.rerender(
      <MapRender lines={lines} colors={colors} markedStations={["KN"]} />,
    );
    expect(fills().size).toBe(2);
    expect(dots().every((dot) => dot.props.r === 10)).toBe(true);
  });
});
