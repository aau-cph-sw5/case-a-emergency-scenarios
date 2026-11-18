import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import {
  PanResponder,
  Text,
  type GestureResponderEvent,
  type PanResponderCallbacks,
  type PanResponderGestureState,
} from "react-native";
import { SwipeToDismiss } from "../../mobile/src/components/SwipeToDismiss";

// The gesture itself comes from React Native, so the test drives the
// callbacks the component gives PanResponder, with the distance and speed.
const create = PanResponder.create.bind(PanResponder);

function renderItem() {
  const created: PanResponderCallbacks[] = [];
  jest.spyOn(PanResponder, "create").mockImplementation((config) => {
    created.push(config);
    return create(config);
  });
  const onDismiss = jest.fn();
  render(
    <SwipeToDismiss onDismiss={onDismiss}>
      <Text>Scenariet er skiftet</Text>
    </SwipeToDismiss>,
  );
  const callbacks = () => created[created.length - 1];
  const event = {} as GestureResponderEvent;
  const gesture = (dx: number, dy = 0, vx = 0) =>
    ({ dx, dy, vx }) as PanResponderGestureState;
  // Lets the slide out (and the slide in) finish.
  const settle = () => act(() => void jest.advanceTimersByTime(1000));
  return {
    onDismiss,
    wantsTouch: (dx: number, dy: number) =>
      callbacks().onMoveShouldSetPanResponder?.(event, gesture(dx, dy)),
    swipe: (dx: number, vx = 0) => {
      act(() => {
        callbacks().onPanResponderMove?.(event, gesture(dx, 0, vx));
        callbacks().onPanResponderRelease?.(event, gesture(dx, 0, vx));
      });
      settle();
    },
    settle,
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("SwipeToDismiss", () => {
  it("shows what it holds", () => {
    renderItem();

    expect(screen.getByText("Scenariet er skiftet")).toBeTruthy();
  });

  it.each([-120, 120])("is dismissed by a long swipe (%d)", (dx) => {
    const item = renderItem();

    item.swipe(dx);

    expect(item.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("is dismissed by a short but fast swipe", () => {
    const item = renderItem();

    item.swipe(30, 0.9);

    expect(item.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("springs back after a short, slow swipe", () => {
    const item = renderItem();

    item.swipe(30, 0.1);

    expect(item.onDismiss).not.toHaveBeenCalled();
  });

  it("takes the touch only for a mostly sideways drag", () => {
    const item = renderItem();

    expect(item.wantsTouch(20, 3)).toBe(true);
    expect(item.wantsTouch(2, 1)).toBe(false);
    expect(item.wantsTouch(10, 40)).toBe(false);
  });

  it("gives screen readers a Luk action that dismisses", () => {
    const item = renderItem();
    const [action] = screen.UNSAFE_root.findAll(
      (node) => typeof node.props.onAccessibilityAction === "function",
    );
    const run = (actionName: string) =>
      act(() =>
        action.props.onAccessibilityAction({ nativeEvent: { actionName } }),
      );

    run("somethingElse");
    item.settle();
    expect(item.onDismiss).not.toHaveBeenCalled();

    run("dismiss");
    item.settle();
    expect(item.onDismiss).toHaveBeenCalledTimes(1);
  });
});
