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

// 0 is the first slide shown: arrival when on the way, else check out.
function confirmSlide(index = 0) {
  fireEvent(
    screen.getAllByTestId("slide-to-confirm")[index],
    "accessibilityAction",
    {
      nativeEvent: { actionName: "activate" },
    },
  );
}

describe("StewardStatusControl", () => {
  it("shows no status and points to + when the steward has none", () => {
    renderControl();
    expect(screen.getByText("Ingen status")).toBeTruthy();
    expect(screen.getByText(/Tryk \+ ved en station/)).toBeTruthy();
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
  });

  it("shows on the way with the station and offers arrival and check out", () => {
    const { onArrive, onCheckOut } = renderControl({
      own: { station: "Station B", status: "PENDING" },
      coverage,
    });
    expect(screen.getByText("DU ER PÅ VEJ")).toBeTruthy();
    expect(screen.getByText("Station B")).toBeTruthy();
    expect(screen.getByText("1 af 2 ankommet · 1 på vej")).toBeTruthy();
    confirmSlide();
    expect(onArrive).toHaveBeenCalledTimes(1);
    confirmSlide(1);
    expect(onCheckOut).toHaveBeenCalledTimes(1);
  });

  it("shows arrived and offers the check out slide", () => {
    const { onArrive, onCheckOut } = renderControl({
      own: { station: "Station B", status: "MANNED" },
      coverage: { arrived: 2, enRoute: 0, needed: 2 },
    });
    expect(screen.getByText("✓ DU ER ANKOMMET")).toBeTruthy();
    expect(screen.getByText("Du er tjekket ind på Station B.")).toBeTruthy();
    confirmSlide();
    expect(onCheckOut).toHaveBeenCalledTimes(1);
    expect(onArrive).not.toHaveBeenCalled();
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
});
