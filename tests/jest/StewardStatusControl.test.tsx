import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StewardStatusControl } from "../../mobile/src/components/StewardStatusControl";
import { StyleSheet } from "react-native";
import { steward } from "../../shared/Theme";

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

// TJEK UD, then the red BEKRÆFT TJEK UD slide (#377).
async function checkOut() {
  fireEvent.press(screen.getByText("TJEK UD"));
  await screen.findByText("BEKRÆFT TJEK UD");
  confirmSlide();
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

  it("shows arrived and offers only Tjek ud", async () => {
    const { onCheckOut } = renderControl({
      own: { station: "Station B", status: "MANNED" },
      coverage: { arrived: 2, enRoute: 0, needed: 2 },
    });
    expect(screen.getByText("ANKOMMET 2/2")).toBeTruthy();
    expect(screen.getByText("2 på stationen")).toBeTruthy();
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
    await checkOut();
    expect(onCheckOut).toHaveBeenCalledTimes(1);
  });

  // Checking out takes two steps (#377): TJEK UD, then the red slide; its
  // cross steps back without checking out.
  it("checks out only after TJEK UD and the red slide", async () => {
    const { onCheckOut } = renderControl({
      own: { station: "Station B", status: "MANNED" },
    });
    fireEvent.press(screen.getByText("TJEK UD"));
    await screen.findByText("BEKRÆFT TJEK UD");
    expect(onCheckOut).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Fortryd tjek ud"));
    await screen.findByText("TJEK UD");
    expect(onCheckOut).not.toHaveBeenCalled();
  });

  // Cancelling is the cross next to CHECK IND, not a button of its own (#376).
  it("offers no FORTRYD button while on the way", () => {
    renderControl({ own: { station: "Station B", status: "PENDING" } });
    expect(screen.queryByText("FORTRYD")).toBeNull();
    expect(screen.queryByText("TJEK UD")).toBeNull();
  });

  // After checking out the card is back at the start (#376).
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
    expect(screen.queryByText("BEKRÆFT TJEK UD")).toBeNull();
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

  // The status card's colour is the status (#376): black without a station,
  // yellow on the way, green once arrived. The scenario sits in the card.
  it("colours the status card by the status", () => {
    const cardColour = () =>
      StyleSheet.flatten(screen.getByTestId("status-card").props.style)
        ?.backgroundColor;
    renderControl({ scenario: "DEMO-001" });
    expect(cardColour()).toBe(steward.card.none.background);
    expect(screen.getByText("DEMO-001")).toBeTruthy();
    screen.unmount();
    renderControl({ own: { station: "Station B", status: "PENDING" } });
    expect(cardColour()).toBe(steward.card.onTheWay.background);
    screen.unmount();
    renderControl({ own: { station: "Station B", status: "MANNED" } });
    expect(cardColour()).toBe(steward.card.arrived.background);
  });

  // Cancelling takes two steps, like checking out (#376): the cross next to
  // CHECK IND, then the red slide; the second cross goes back.
  it("cancels only after the cross and the red slide", async () => {
    const onCancel = jest.fn();
    renderControl({
      own: { station: "Station B", status: "PENDING" },
      onCancel,
    });
    expect(screen.queryByText("BEKRÆFT ANNULLÉR")).toBeNull();
    fireEvent.press(screen.getByLabelText("Annullér tildeling"));
    await screen.findByText("BEKRÆFT ANNULLÉR");
    fireEvent.press(screen.getByLabelText("Fortryd annullering"));
    await screen.findByText("CHECK IND");
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Annullér tildeling"));
    await screen.findByText("BEKRÆFT ANNULLÉR");
    confirmSlide();
    expect(onCancel).toHaveBeenCalledTimes(1);
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
  it("offers Tjek ud when the task is done", async () => {
    const { onCheckOut } = renderControl({
      own: { station: "Station B", status: "TASK_DONE" },
    });
    expect(screen.queryByTestId("slide-to-confirm")).toBeNull();
    await checkOut();
    expect(onCheckOut).toHaveBeenCalledTimes(1);
  });
});
