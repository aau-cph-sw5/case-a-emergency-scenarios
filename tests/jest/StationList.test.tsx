import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StationList } from "../../mobile/src/components/StationList";

describe("StationList", () => {
  it("reports a station with a single press", () => {
    const onSelect = jest.fn();
    render(
      <StationList
        stations={["Station B", "Station A"]}
        current={null}
        disabled={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByText("Station A"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("Station A");
  });

  it("marks the current position", () => {
    render(
      <StationList
        stations={["Station B", "Station A"]}
        current="Station B"
        disabled={false}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText("Station B (din position)")).toBeTruthy();
    expect(screen.getByText("Station A")).toBeTruthy();
  });

  it("does not report while a report is being sent", () => {
    const onSelect = jest.fn();
    render(
      <StationList
        stations={["Station A"]}
        current={null}
        disabled={true}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByText("Station A"));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
