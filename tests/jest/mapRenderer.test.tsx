import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { Circle } from "react-native-svg";
import MapRender from "../../shared/MapRenderer";

const colors = { M2: "#00f" };

// SVG text is not reachable by getByText, so the stations are counted by
// their dots.
function drawnStations() {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .map((dot) => [dot.props.cx, dot.props.cy]);
}

describe("MapRender", () => {
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

  it("draws marked stations larger, and the others as before", () => {
    const lines = [
      {
        name: "M2",
        tracks: [1, 2],
        connections: [["FOR", "KN"]] as [string, string][],
      },
    ];
    const radii = () =>
      screen.UNSAFE_queryAllByType(Circle).map((dot) => dot.props.r);

    const view = render(<MapRender lines={lines} colors={colors} />);
    expect(radii().every((r) => r === 10)).toBe(true);

    view.rerender(
      <MapRender lines={lines} colors={colors} markedStations={["KN"]} />,
    );
    expect(radii()).toContain(12);
    expect(radii()).toContain(10);
  });
});
