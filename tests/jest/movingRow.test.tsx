import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Animated, Text } from "react-native";
import { MovingRow } from "../../mobile/src/components/MovingRow";
import { motion } from "../../shared/Theme";

afterEach(() => jest.restoreAllMocks());

const row = (top: number, place: number) => (
  <MovingRow top={top} place={place}>
    <Text>Station F</Text>
  </MovingRow>
);

describe("MovingRow", () => {
  it("slides a row that changes place in the order", () => {
    const timing = jest.spyOn(Animated, "timing");
    const { rerender } = render(row(64, 1));

    rerender(row(0, 0));

    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: motion.rowMoveMs }),
    );
  });

  it("does not slide a row that is only pushed down by a taller row above", () => {
    const timing = jest.spyOn(Animated, "timing");
    const { rerender } = render(row(48, 1));

    rerender(row(64, 1));

    expect(timing).not.toHaveBeenCalled();
  });

  it("does nothing while the row stays where it is", () => {
    const timing = jest.spyOn(Animated, "timing");
    const { rerender } = render(row(48, 1));

    rerender(row(48, 1));

    expect(timing).not.toHaveBeenCalled();
  });
});
