import { describe, expect, it } from "@jest/globals";
import { clockTime } from "../../mobile/src/clock-time";

describe("clockTime", () => {
  it("gives the hour and minute on the phone's own clock, with a leading zero", () => {
    expect(clockTime(new Date(2026, 10, 18, 14, 32).toISOString())).toBe(
      "14:32",
    );
    expect(clockTime(new Date(2026, 10, 18, 7, 5).toISOString())).toBe("07:05");
  });

  it("gives nothing for text that is not a date", () => {
    expect(clockTime("not a date")).toBe("");
  });
});
