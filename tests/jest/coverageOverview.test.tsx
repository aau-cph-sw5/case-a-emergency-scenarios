import { render, screen } from "@testing-library/react-native";
import { CoverageOverview } from "../../shared/components/coverageOverview";
import {
  coverageLevel,
  type CoverageLevel,
  densityFor,
} from "../../shared/components/stationState";

const st = (name: string, level: CoverageLevel) => ({ name, level });

describe("CoverageOverview", () => {
  it("counts covered stations and draws one cell per station", () => {
    render(
      <CoverageOverview
        stations={[
          st("LGP", "gap"),
          st("KHC", "covered"),
          st("ØSV", "partial"),
          st("AMB", "covered"),
        ]}
      />,
    );
    expect(screen.getByText("af 4 stationer dækket")).toBeTruthy();
    expect(screen.getByTestId("legend-count-Ankommet").props.children).toBe(2);
    expect(screen.getAllByTestId("coverage-cell-covered")).toHaveLength(2);
    expect(screen.getAllByTestId("coverage-cell-partial")).toHaveLength(1);
    expect(screen.getAllByTestId("coverage-cell-gap")).toHaveLength(1);
  });

  it("orders the cells green, yellow, red", () => {
    render(
      <CoverageOverview
        stations={[st("A", "gap"), st("B", "partial"), st("C", "covered")]}
      />,
    );
    const order = screen
      .getAllByTestId(/^coverage-cell-/)
      .map((cell) => cell.props.testID);
    expect(order).toEqual([
      "coverage-cell-covered",
      "coverage-cell-partial",
      "coverage-cell-gap",
    ]);
  });

  it("shows the legend labels", () => {
    render(<CoverageOverview stations={[st("A", "covered")]} />);
    for (const label of ["Ankommet", "På vej", "Mangler"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("puts the station code in each cell and a count in each legend item", () => {
    render(
      <CoverageOverview
        stations={[st("LGP", "gap"), st("KHC", "gap"), st("AMB", "covered")]}
      />,
    );
    expect(screen.getByText("LGP")).toBeTruthy();
    expect(screen.getByText("AMB")).toBeTruthy();
    expect(screen.getByText("Mangler")).toBeTruthy();
    expect(screen.getByTestId("legend-count-Mangler").props.children).toBe(2);
    expect(screen.getByTestId("legend-count-Ankommet").props.children).toBe(1);
  });

  it("leaves the station codes out when there are too many for the cells", () => {
    const many = Array.from({ length: 13 }, (_, i) => st(`S${i}`, "gap"));
    render(<CoverageOverview stations={many} />);
    expect(screen.queryByText("S0")).toBeNull();
    expect(screen.getAllByTestId("coverage-cell-gap")).toHaveLength(13);
  });

  it("does not say 0 af 0 for an empty list", () => {
    render(<CoverageOverview stations={[]} />);
    expect(screen.getByText("Ingen stationer")).toBeTruthy();
    expect(screen.queryByText(/af 0/)).toBeNull();
    expect(screen.queryAllByTestId(/^coverage-cell-/)).toHaveLength(0);
  });
});

describe("station state helpers", () => {
  it("treats stewards on the way as partial, not a gap", () => {
    expect(coverageLevel(0, 2)).toBe("gap");
    expect(coverageLevel(0, 2, 1)).toBe("partial");
    expect(coverageLevel(2, 2, 0)).toBe("covered");
  });

  it("picks density from the station count", () => {
    expect(densityFor(8)).toBe("roomy");
    expect(densityFor(9)).toBe("snug");
    expect(densityFor(14)).toBe("snug");
    expect(densityFor(15)).toBe("tight");
  });
});
