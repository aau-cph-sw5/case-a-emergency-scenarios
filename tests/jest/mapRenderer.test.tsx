import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Circle, Line, Path, Text } from "react-native-svg";
import MapRender from "../../shared/MapRenderer";
import { colors as theme, coverageColors, palette } from "../../shared/Theme";
import { getLines } from "../../mockData/data";

const colors = { M2: "#00f" };

// SVG text is not reachable by getByText, so the stations are counted by
// their dots.
function drawnStations() {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .map((dot) => [dot.props.cx, dot.props.cy]);
}

function circleByTestId(testID: string) {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .find((node) => node.props.testID === testID);
}

function svgTextByTestId(testID: string) {
  return screen
    .UNSAFE_queryAllByType(Text)
    .find((node) => node.props.testID === testID);
}

describe("MapRender", () => {
  it("lets callers select both ordinary and highlighted stations", () => {
    const onStationPress = jest.fn();
    render(
      <MapRender
        lines={[{ name: "M2", tracks: [1, 2], connections: [["VAN", "FL"]] }]}
        colors={colors}
        markedStations={["VAN"]}
        onStationPress={onStationPress}
      />,
    );
    fireEvent.press(screen.getByLabelText("Vælg station VAN"));
    fireEvent.press(screen.getByLabelText("Vælg station FL"));
    expect(onStationPress).toHaveBeenCalledWith("VAN");
    expect(onStationPress).toHaveBeenCalledWith("FL");
  });
  it("marks stops without marking stations passed through", () => {
    render(
      <MapRender
        lines={[
          {
            name: "M2",
            tracks: [1],
            connections: [
              ["A", "B"],
              ["B", "C"],
            ],
          },
        ]}
        colors={colors}
        positions={{ A: [0, 0], B: [50, 0], C: [100, 0] }}
        crossovers={[]}
        stopStations={["A", "C"]}
        markedStations={["A"]}
      />,
    );
    const markers = screen
      .UNSAFE_queryAllByType(Circle)
      .filter((dot) => dot.props.r === 3);
    expect(markers.map((dot) => dot.props.cx)).toEqual(
      expect.arrayContaining([0, 100]),
    );
    expect(markers).toHaveLength(2);
  });

  it("draws shared crossovers on visible segments and accepts colour overrides", () => {
    const lines = [
      {
        name: "M2",
        tracks: [1, 2],
        connections: [["VAN", "FL"]] as [string, string][],
      },
    ];
    const view = render(<MapRender lines={lines} colors={colors} />);
    expect(screen.getByTestId("crossover-VAN-FL")).toBeTruthy();
    expect(screen.queryByTestId("crossover-KN-KGN")).toBeNull();
    view.rerender(<MapRender lines={lines} colors={colors} crossovers={[]} />);
    expect(screen.queryByTestId("crossover-VAN-FL")).toBeNull();
    view.rerender(
      <MapRender
        lines={lines}
        colors={colors}
        crossovers={[
          { stationA: "VAN", stationB: "FL", color: "#f00" },
          { stationA: "KN", stationB: "KGN", color: "#f00" },
        ]}
      />,
    );
    expect(screen.getByTestId("crossover-VAN-FL")).toBeTruthy();
    expect(screen.queryByTestId("crossover-KN-KGN")).toBeNull();
    const crossoverLines = screen
      .UNSAFE_queryAllByType(Line)
      .filter((line) => line.props.stroke === "#f00");
    expect(crossoverLines).toHaveLength(2);
    expect(crossoverLines.every((line) => !line.props.strokeDasharray)).toBe(
      true,
    );
  });

  it("connects a curved ring crossover to both curved tracks", () => {
    const line = getLines().find((candidate) => candidate.name === "M3")!;
    render(
      <MapRender
        lines={[{ ...line, tracks: [1, 2] }]}
        colors={{ M3: "#00f" }}
        crossovers={[{ stationA: "NØ", stationB: "NØR", color: "#f00" }]}
      />,
    );
    const crossoverLines = screen
      .UNSAFE_queryAllByType(Line)
      .filter((item) => item.props.stroke === "#f00");
    expect(crossoverLines).toHaveLength(2);
    expect(crossoverLines[0].props.x1).not.toBe(crossoverLines[1].props.x1);
    expect(crossoverLines[0].props.y1).not.toBe(crossoverLines[1].props.y1);
  });
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

  it("renders a route over a station-only network line", () => {
    render(
      <MapRender
        lines={[
          { name: "M1", tracks: [], connections: [["VAN", "FL"]] },
          { name: "preview", tracks: [1], connections: [["VAN", "FL"]] },
        ]}
        colors={{ preview: "#e6140f" }}
        positions={{ VAN: [0, 0], FL: [50, 0] }}
        ringStations={[]}
        availableSegments={[
          { trackNumber: 1, stationA: "VAN", stationB: "FL" },
        ]}
        crossovers={[]}
      />,
    );
    const route = screen
      .UNSAFE_queryAllByType(Line)
      .filter((line) => line.props.stroke === "#e6140f");
    expect(route.length).toBeGreaterThan(0);
  });

  it("draws a circular ring with arcs between unevenly spaced stations", () => {
    const stations = ["A", "B", "C", "D"];
    render(
      <MapRender
        lines={[
          {
            name: "M3",
            tracks: [1, 2],
            connections: [
              ["A", "B"],
              ["B", "C"],
              ["C", "D"],
              ["D", "A"],
            ],
          },
        ]}
        colors={{ M3: "#f00" }}
        positions={{ A: [100, 0], B: [60, 80], C: [-100, 0], D: [0, -100] }}
        ringStations={stations}
      />,
    );
    const paths = screen.UNSAFE_queryAllByType(Path);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => / A /.test(path.props.d))).toBe(true);
  });

  it("removes old tracks after a route with repeated segments changes", () => {
    const positions = {
      A: [0, 20] as [number, number],
      B: [100, 20] as [number, number],
      C: [200, 20] as [number, number],
    };
    const view = render(
      <MapRender
        lines={[
          {
            name: "preview",
            tracks: [1],
            connections: [
              ["A", "B"],
              ["B", "A"],
              ["B", "C"],
            ],
          },
        ]}
        colors={{ preview: "red" }}
        positions={positions}
        ringStations={[]}
        crossovers={[]}
      />,
    );
    expect(screen.UNSAFE_queryAllByType(Line)).toHaveLength(4);
    view.rerender(
      <MapRender
        lines={[{ name: "preview", tracks: [1], connections: [["B", "C"]] }]}
        colors={{ preview: "red" }}
        positions={positions}
        ringStations={[]}
        crossovers={[]}
      />,
    );
    const lines = screen.UNSAFE_queryAllByType(Line);
    expect(lines).toHaveLength(2);
    expect(
      lines.every((line) => line.props.x1 === 100 && line.props.x2 === 200),
    ).toBe(true);
  });

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

  it("uses view-specific station positions without changing the default layout", () => {
    const lines = [
      {
        name: "M2",
        tracks: [1, 2],
        connections: [["KN", "KGN"]] as [string, string][],
      },
    ];
    const view = render(<MapRender lines={lines} colors={colors} />);
    expect(drawnStations()).toContainEqual([648, 347]);
    view.rerender(
      <MapRender
        lines={lines}
        colors={colors}
        stationPositions={{ KGN: [648, 343] }}
      />,
    );
    expect(drawnStations()).toContainEqual([648, 343]);
    expect(drawnStations()).toContainEqual([565, 343]);
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

  it.each(["covered", "partial", "gap"] as const)(
    "keeps %s coverage fill and draws a Metro Black outer ring with a white gap for the own station",
    (level) => {
      render(
        <MapRender
          lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
          colors={colors}
          highlightStation="KN"
          highlightColor={palette.metroSummerRed}
          markedStations={["FOR", "KN"]}
          requiredStaffing={{ FOR: 1, KN: 2 }}
          stationCoverage={{ FOR: "covered", KN: level }}
        />,
      );

      const ownDot = circleByTestId("station-dot-KN")!;
      const ownGap = circleByTestId("own-station-gap-KN")!;
      const ownRing = circleByTestId("own-station-ring-KN")!;
      const ownStaffing = svgTextByTestId("station-staffing-KN")!;
      const ownLabel = svgTextByTestId("station-label-KN")!;

      expect(ownDot).toBeDefined();
      expect(ownGap).toBeDefined();
      expect(ownRing).toBeDefined();
      expect(ownStaffing).toBeDefined();
      expect(ownLabel).toBeDefined();

      expect(ownDot.props.fill).toBe(coverageColors[level].fill);
      expect(ownDot.props.fill).not.toBe(palette.metroSummerRed);
      expect(ownDot.props.stroke).toBe(theme.text);
      expect(ownStaffing.props.fill).toBe(coverageColors[level].text);
      expect(ownStaffing.props.children).toBe(2);

      // Concentric geometry: white gap sits outside the dot's stroke, and the
      // Metro Black outer ring sits outside the white gap with no overlap.
      const dotOuterEdge = ownDot.props.r + ownDot.props.strokeWidth / 2;
      const gapInnerEdge = ownGap.props.r - ownGap.props.strokeWidth / 2;
      const gapOuterEdge = ownGap.props.r + ownGap.props.strokeWidth / 2;
      const ringInnerEdge = ownRing.props.r - ownRing.props.strokeWidth / 2;
      const ringOuterEdge = ownRing.props.r + ownRing.props.strokeWidth / 2;

      expect(ownGap.props.cx).toBe(ownDot.props.cx);
      expect(ownGap.props.cy).toBe(ownDot.props.cy);
      expect(ownGap.props.fill).toBe("none");
      expect(ownGap.props.stroke).toBe(theme.background);
      expect(ownGap.props.pointerEvents).toBe("none");
      expect(gapInnerEdge).toBeGreaterThanOrEqual(dotOuterEdge);

      expect(ownRing.props.cx).toBe(ownDot.props.cx);
      expect(ownRing.props.cy).toBe(ownDot.props.cy);
      expect(ownRing.props.fill).toBe("none");
      expect(ownRing.props.stroke).toBe(theme.text);
      expect(ownRing.props.pointerEvents).toBe("none");
      expect(ringInnerEdge).toBeGreaterThanOrEqual(gapOuterEdge);

      expect(ownLabel.props.fill).toBe(theme.text);
      expect(ownLabel.props.x).toBeGreaterThan(ownDot.props.cx + ringOuterEdge);

      // Other covered stations keep their coverage fill without an outer ring.
      expect(circleByTestId("station-dot-FOR")?.props.fill).toBe(
        coverageColors.covered.fill,
      );
      expect(svgTextByTestId("station-staffing-FOR")?.props.fill).toBe(
        coverageColors.covered.text,
      );
      expect(svgTextByTestId("station-label-FOR")?.props.fill).toBe(theme.text);
      expect(circleByTestId("own-station-gap-FOR")).toBeUndefined();
      expect(circleByTestId("own-station-ring-FOR")).toBeUndefined();
    },
  );

  it("renders live coverage without an outer ring on a marked station and keeps unmarked stations plain", () => {
    render(
      <MapRender
        lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
        colors={colors}
        markedStations={["FOR"]}
        requiredStaffing={{ FOR: 3, KN: 1 }}
        stationCoverage={{ FOR: "partial", KN: "gap" }}
      />,
    );

    expect(circleByTestId("station-dot-FOR")?.props.fill).toBe(
      coverageColors.partial.fill,
    );
    expect(svgTextByTestId("station-staffing-FOR")?.props.fill).toBe(
      coverageColors.partial.text,
    );
    expect(svgTextByTestId("station-staffing-FOR")?.props.children).toBe(3);
    expect(svgTextByTestId("station-label-FOR")?.props.fill).toBe(theme.text);
    expect(circleByTestId("own-station-gap-FOR")).toBeUndefined();
    expect(circleByTestId("own-station-ring-FOR")).toBeUndefined();

    // Unmarked ordinary stations stay plain without coverage fill, staffing or outer ring.
    expect(circleByTestId("station-dot-KN")?.props.fill).toBe(theme.background);
    expect(svgTextByTestId("station-staffing-KN")).toBeUndefined();
    expect(svgTextByTestId("station-label-KN")?.props.fill).toBe(theme.text);
    expect(circleByTestId("own-station-gap-KN")).toBeUndefined();
    expect(circleByTestId("own-station-ring-KN")).toBeUndefined();
  });

  it("keeps highlightColor fill and label when highlighted or marked stations have no coverage", () => {
    const view = render(
      <MapRender
        lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
        colors={colors}
        highlightStation="KN"
        markedStations={["FOR"]}
        highlightColor={palette.metroSummerRed}
      />,
    );

    expect(circleByTestId("station-dot-KN")?.props.fill).toBe(
      palette.metroSummerRed,
    );
    expect(svgTextByTestId("station-label-KN")?.props.fill).toBe(
      palette.metroSummerRed,
    );
    expect(circleByTestId("own-station-gap-KN")).toBeUndefined();
    expect(circleByTestId("own-station-ring-KN")).toBeUndefined();

    expect(circleByTestId("station-dot-FOR")?.props.fill).toBe(
      palette.metroSummerRed,
    );
    expect(svgTextByTestId("station-label-FOR")?.props.fill).toBe(
      palette.metroSummerRed,
    );
    expect(circleByTestId("own-station-gap-FOR")).toBeUndefined();
    expect(circleByTestId("own-station-ring-FOR")).toBeUndefined();

    // Inactive operator preview: marked stations without live coverage keep
    // their requiredStation highlight fill and label colour.
    view.rerender(
      <MapRender
        lines={[{ name: "M2", tracks: [1, 2], connections: [["FOR", "KN"]] }]}
        colors={colors}
        markedStations={["KN"]}
        highlightColor={theme.requiredStation}
      />,
    );

    expect(circleByTestId("station-dot-KN")?.props.fill).toBe(
      theme.requiredStation,
    );
    expect(svgTextByTestId("station-label-KN")?.props.fill).toBe(
      theme.requiredStation,
    );
    expect(circleByTestId("own-station-gap-KN")).toBeUndefined();
    expect(circleByTestId("own-station-ring-KN")).toBeUndefined();
  });
});
