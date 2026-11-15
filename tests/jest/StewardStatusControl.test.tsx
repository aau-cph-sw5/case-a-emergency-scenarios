import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StewardStatusControl } from "../../mobile/src/components/StewardStatusControl";

const coverage = { arrived: 1, enRoute: 1, needed: 2 };

function renderControl(
  props: Partial<Parameters<typeof StewardStatusControl>[0]> = {},
) {
  const onArrive = jest.fn();
  const onCheckOut = jest.fn();
  render(
    <StewardStatusControl
      own={null}
      coverage={null}
      blockedReason={null}
      sending={false}
      error={null}
      onArrive={onArrive}
      onCheckOut={onCheckOut}
      {...props}
    />,
  );
  return { onArrive, onCheckOut };
}

function confirmSlide() {
  fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
    nativeEvent: { actionName: "activate" },
  });
}

describe("StewardStatusControl (MET-A-015, #263, #305)", () => {
  it("shows no status, and no slide when the steward cannot choose", () => {
    renderControl();
    expect(screen.getByText("IKKE VALGT")).toBeTruthy();
    expect(screen.getByText("Vælg den nærmeste station")).toBeTruthy();
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
  });

  // The yellow BEKRÆFT slide assigns the station chosen in the list (#376).
  it("locks BEKRÆFT until a station is chosen, then assigns it", () => {
    const onAssign = jest.fn();
    renderControl({ onAssign });
    expect(screen.getByText("Vælg en station")).toBeTruthy();
    confirmSlide();
    expect(onAssign).not.toHaveBeenCalled();
    screen.unmount();
    renderControl({ onAssign, selected: "Station B" });
    confirmSlide();
    expect(onAssign).toHaveBeenCalledTimes(1);
  });

  it("shows on the way with the station and offers only the arrival slide", () => {
    const { onArrive } = renderControl({
      own: { station: "Station B", status: "PENDING" },
      coverage,
    });
    expect(screen.getByText("PÅ VEJ")).toBeTruthy();
    expect(screen.getByText("Station B")).toBeTruthy();
    expect(screen.getByText("1 på stationen · 1 på vej")).toBeTruthy();
    confirmSlide();
    expect(onArrive).toHaveBeenCalledTimes(1);
  });

  it("shows arrived and offers only Tjek ud", () => {
    const { onCheckOut } = renderControl({
      own: { station: "Station B", status: "MANNED" },
      coverage: { arrived: 2, enRoute: 0, needed: 2 },
    });
    expect(screen.getByText("ANKOMMET 2/2")).toBeTruthy();
    expect(screen.getByText("2 på stationen")).toBeTruthy();
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
    fireEvent.press(screen.getByText("TJEK UD"));
    expect(onCheckOut).toHaveBeenCalledTimes(1);
  });

  // Cancelling is the swipe on the own row in the list, not a button (#376).
  it("offers no FORTRYD button while on the way", () => {
    renderControl({ own: { station: "Station B", status: "PENDING" } });
    expect(screen.queryByText("FORTRYD")).toBeNull();
    expect(screen.queryByText("TJEK UD")).toBeNull();
  });

  // Checked out is a 4 s note only; then the box is back at the start (#376).
  it("is back at no station after checking out", () => {
    renderControl({ own: { station: "Station B", status: "CHECKED_OUT" } });
    expect(screen.getByText("IKKE VALGT")).toBeTruthy();
    expect(screen.getByText("Ingen station")).toBeTruthy();
    expect(screen.queryByText("CHECKET UD")).toBeNull();
    expect(screen.queryByText("TJEK UD")).toBeNull();
  });

  it("locks Tjek ud while a change is being sent", () => {
    const manned = renderControl({
      own: { station: "Station B", status: "MANNED" },
      sending: true,
    });
    fireEvent.press(screen.getByText("TJEK UD"));
    expect(manned.onCheckOut).not.toHaveBeenCalled();
  });

  it("shows the rejection message", () => {
    renderControl({
      own: { station: "Station B", status: "PENDING" },
      error: "Den status kan du ikke skifte til lige nu.",
    });
    expect(
      screen.getByText("Den status kan du ikke skifte til lige nu."),
    ).toBeTruthy();
  });

  it("tells why and sends nothing while blocked by the offline copy", () => {
    const { onArrive } = renderControl({
      own: { station: "Station B", status: "PENDING" },
      blockedReason: "Du ser en gemt kopi uden forbindelse.",
    });
    expect(
      screen.getByText("Du ser en gemt kopi uden forbindelse."),
    ).toBeTruthy();
    confirmSlide();
    expect(onArrive).not.toHaveBeenCalled();
  });

  it("does not confirm twice while a change is being sent", () => {
    const { onArrive } = renderControl({
      own: { station: "Station B", status: "PENDING" },
      sending: true,
    });
    confirmSlide();
    expect(onArrive).not.toHaveBeenCalled();
  });

  // The note turns the status box over after the steward's own change (#375).
  it("shows the note on the status box", () => {
    renderControl({
      own: { station: "Station B", status: "PENDING" },
      note: { key: 1, text: "Tag til Station B", background: "y", color: "b" },
    });
    expect(screen.getByText("Tag til Station B")).toBeTruthy();
  });

  it("locks the check in slide without a connection", () => {
    const { onArrive } = renderControl({
      own: { station: "Station B", status: "PENDING" },
      offline: true,
    });
    expect(screen.getByText("Ingen forbindelse")).toBeTruthy();
    confirmSlide();
    expect(onArrive).not.toHaveBeenCalled();
  });

  // After a reload the server can report the task as done (#310).
  it("offers Tjek ud when the task is done", () => {
    const { onCheckOut } = renderControl({
      own: { station: "Station B", status: "TASK_DONE" },
    });
    fireEvent.press(screen.getByText("TJEK UD"));
    expect(onCheckOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
  });
});
