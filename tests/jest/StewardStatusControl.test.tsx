import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StewardStatusControl } from "../../mobile/src/components/StewardStatusControl";

const coverage = { arrived: 1, enRoute: 1, needed: 2 };

function renderControl(
  props: Partial<Parameters<typeof StewardStatusControl>[0]> = {},
) {
  const onArrive = jest.fn();
  const onCancel = jest.fn();
  const onCheckOut = jest.fn();
  render(
    <StewardStatusControl
      own={null}
      coverage={null}
      blockedReason={null}
      sending={false}
      error={null}
      onArrive={onArrive}
      onCancel={onCancel}
      onCheckOut={onCheckOut}
      {...props}
    />,
  );
  return { onArrive, onCancel, onCheckOut };
}

function confirmSlide() {
  fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
    nativeEvent: { actionName: "activate" },
  });
}

describe("StewardStatusControl (MET-A-015, #263, #305)", () => {
  it("shows no status and points to + when the steward has none", () => {
    renderControl();
    expect(screen.getByText("Ingen status")).toBeTruthy();
    expect(screen.getByText(/Tryk \+ ved en station/)).toBeTruthy();
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
  });

  it("shows on the way with the station and offers only the arrival slide", () => {
    const { onArrive } = renderControl({
      own: { station: "Station B", status: "PENDING" },
      coverage,
    });
    expect(screen.getByText("DU ER PÅ VEJ")).toBeTruthy();
    expect(screen.getByText("Station B")).toBeTruthy();
    expect(screen.getByText("1 af 2 ankommet · 1 på vej")).toBeTruthy();
    expect(screen.getByText(/Forkert station\?/)).toBeTruthy();
    confirmSlide();
    expect(onArrive).toHaveBeenCalledTimes(1);
  });

  it("shows arrived and offers only Tjek ud", () => {
    const { onCheckOut } = renderControl({
      own: { station: "Station B", status: "MANNED" },
      coverage: { arrived: 2, enRoute: 0, needed: 2 },
    });
    expect(screen.getByText("✓ DU ER ANKOMMET")).toBeTruthy();
    expect(screen.getByText("Du er tjekket ind på Station B.")).toBeTruthy();
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
    expect(screen.queryByText("FORTRYD")).toBeNull();
    fireEvent.press(screen.getByText("TJEK UD"));
    expect(onCheckOut).toHaveBeenCalledTimes(1);
  });

  it("offers Fortryd while on the way", () => {
    const { onCancel } = renderControl({
      own: { station: "Station B", status: "PENDING" },
    });
    expect(screen.queryByText("TJEK UD")).toBeNull();
    fireEvent.press(screen.getByText("FORTRYD"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows no status after checking out, with the station that was left", () => {
    renderControl({ own: { station: "Station B", status: "CHECKED_OUT" } });
    expect(screen.getByText("Ingen status")).toBeTruthy();
    expect(screen.getByText("Du er tjekket ud fra Station B.")).toBeTruthy();
    expect(screen.queryByText("TJEK UD")).toBeNull();
  });

  it("locks Fortryd and Tjek ud while blocked", () => {
    const pending = renderControl({
      own: { station: "Station B", status: "PENDING" },
      blockedReason: "Offline.",
    });
    fireEvent.press(screen.getByText("FORTRYD"));
    expect(pending.onCancel).not.toHaveBeenCalled();
    screen.unmount();
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
