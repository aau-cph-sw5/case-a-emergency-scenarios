import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { Animated } from "react-native";
import { startShineClock } from "../../mobile/src/shineClock";

afterEach(() => jest.restoreAllMocks());

describe("the shine clock", () => {
  it("runs one loop for all texts and stops it when the last text is gone", () => {
    const stop = jest.fn();
    const start = jest.fn();
    const loop = jest.spyOn(Animated, "loop").mockReturnValue({
      start,
      stop,
    } as unknown as Animated.CompositeAnimation);

    const first = startShineClock();
    const second = startShineClock();
    expect(loop).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);

    first();
    expect(stop).not.toHaveBeenCalled();
    second();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("starts a new loop when a text shows after all were gone", () => {
    const loop = jest.spyOn(Animated, "loop").mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    startShineClock()();
    startShineClock()();

    expect(loop).toHaveBeenCalledTimes(2);
  });
});
