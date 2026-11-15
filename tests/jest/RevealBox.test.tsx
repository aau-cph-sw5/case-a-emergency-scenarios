import { describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { RevealBox } from "../../mobile/src/components/RevealBox";

// The content keeps its open size and is pinned to the still edge of the
// box; the box itself opens and closes over it (#377).
describe("RevealBox (#377)", () => {
  it("shows its content while open", () => {
    render(
      <RevealBox open anchor="top" openStyle={{ flex: 1 }}>
        <Text>Station B</Text>
      </RevealBox>,
    );
    expect(screen.getByText("Station B")).toBeTruthy();
  });

  it("has no height and hides its content from screen readers while closed", () => {
    render(
      <RevealBox open={false} anchor="top" openStyle={{ flex: 1 }}>
        <Text>Station B</Text>
      </RevealBox>,
    );
    expect(screen.queryByText("Station B")).toBeNull();
    expect(
      screen.getByText("Station B", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it("pins the content at its open height to the still edge", () => {
    const { rerender } = render(
      <RevealBox open anchor="bottom" openStyle={{ flex: 1 }} testID="box">
        <Text>Opgave</Text>
      </RevealBox>,
    );
    fireEvent(screen.getByTestId("box"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
    });
    rerender(
      <RevealBox
        open={false}
        anchor="bottom"
        openStyle={{ flex: 1 }}
        testID="box"
      >
        <Text>Opgave</Text>
      </RevealBox>,
    );
    expect(
      screen.getByTestId("box-content", { includeHiddenElements: true }),
    ).toHaveStyle({ position: "absolute", bottom: 0, height: 200 });
  });
});
