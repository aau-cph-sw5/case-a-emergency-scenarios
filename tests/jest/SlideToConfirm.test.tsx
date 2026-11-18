import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
  PanResponder,
  type GestureResponderEvent,
  type PanResponderCallbacks,
  type PanResponderGestureState,
} from "react-native";
import { SlideToConfirm } from "../../mobile/src/components/SlideToConfirm";
import { colors, steward } from "../../shared/Theme";

// The gesture itself comes from React Native, so the test drives the
// callbacks the slider gives PanResponder, with the distance it was dragged.
function renderSlider(disabled = false) {
  const created: PanResponderCallbacks[] = [];
  const create = PanResponder.create.bind(PanResponder);
  jest.spyOn(PanResponder, "create").mockImplementation((config) => {
    created.push(config);
    return create(config);
  });
  const onConfirm = jest.fn();
  const view = render(
    <SlideToConfirm
      label="CHECK IND"
      tone="green"
      disabled={disabled}
      onConfirm={onConfirm}
    />,
  );
  // Track 300 wide: the knob can travel 300 - 48 - 8 = 244.
  fireEvent(screen.getByTestId("slide-to-confirm"), "layout", {
    nativeEvent: { layout: { width: 300, height: 60 } },
  });
  const latest = () => created[created.length - 1];
  const event = {} as GestureResponderEvent;
  const gesture = (dx: number) => ({ dx }) as PanResponderGestureState;
  return {
    onConfirm,
    unmount: () => view.unmount(),
    starts: () => latest().onStartShouldSetPanResponder?.(event, gesture(0)),
    moves: () => latest().onMoveShouldSetPanResponder?.(event, gesture(0)),
    keepsGesture: () =>
      latest().onPanResponderTerminationRequest?.(event, gesture(0)),
    drag: (dx: number) =>
      act(() => {
        latest().onPanResponderGrant?.(event, gesture(0));
        latest().onPanResponderMove?.(event, gesture(dx));
        latest().onPanResponderRelease?.(event, gesture(dx));
      }),
    cancel: () =>
      act(() => latest().onPanResponderTerminate?.(event, gesture(0))),
  };
}

afterEach(() => jest.restoreAllMocks());

describe("SlideToConfirm (MET-A-015, #263)", () => {
  it("confirms when slid almost all the way", () => {
    const slider = renderSlider();
    expect(slider.starts()).toBe(true);
    expect(slider.moves()).toBe(true);

    slider.drag(230);

    expect(slider.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("springs back without confirming after a short slide or a cancel", () => {
    const slider = renderSlider();

    slider.drag(100);
    slider.drag(-50);
    slider.cancel();

    expect(slider.onConfirm).not.toHaveBeenCalled();
  });

  it("takes no gesture and no screen reader action while disabled", () => {
    const slider = renderSlider(true);
    expect(slider.starts()).toBe(false);
    expect(slider.moves()).toBe(false);

    fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });

    expect(slider.onConfirm).not.toHaveBeenCalled();
  });

  it("confirms with the screen reader's activate action", () => {
    const slider = renderSlider();

    fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });

    expect(slider.onConfirm).toHaveBeenCalledTimes(1);
  });

  // A vertical drift while sliding must not hand the gesture to the page
  // (the ScrollView), which scrolled the page and reset the knob.
  it("keeps the gesture when the page asks for it", () => {
    const slider = renderSlider();
    expect(slider.keepsGesture()).toBe(false);
  });

  // The looks from the prototype (#375): yellow with dark text, green and red
  // with white text, and grey with a padlock when it cannot be used.
  it.each([
    ["yellow", steward.yellow, colors.text],
    ["green", steward.green, colors.textInverse],
    ["red", steward.red, colors.textInverse],
  ] as const)("has the %s look", (tone, track, label) => {
    render(
      <SlideToConfirm label="BEKRÆFT" tone={tone} onConfirm={jest.fn()} />,
    );
    expect(screen.getByTestId("slide-to-confirm")).toHaveStyle({
      backgroundColor: track,
    });
    expect(screen.getByText("BEKRÆFT")).toHaveStyle({ color: label });
  });

  it("is grey, shows why and confirms nothing while locked", () => {
    const onConfirm = jest.fn();
    render(
      <SlideToConfirm
        label="CHECK IND"
        tone="green"
        lockedReason="Ingen forbindelse"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByTestId("slide-to-confirm")).toHaveStyle({
      backgroundColor: steward.locked,
    });
    expect(screen.getByText("Ingen forbindelse")).toBeTruthy();
    expect(screen.getByTestId("slide-lock")).toBeTruthy();
    fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
