import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { sendPositionReport } from "../../mobile/src/api/position-report";
import {
  resetRememberedStatuses,
  stewardStatus,
} from "../../mobile/src/data/steward-status";
import { ERROR_CODES } from "../../shared/error-codes";

jest.mock("../../mobile/src/api/position-report", () => ({
  sendPositionReport: jest.fn(),
}));

const report = sendPositionReport as jest.MockedFunction<
  typeof sendPositionReport
>;

beforeEach(() => {
  report.mockResolvedValue({ ok: true, message: "Position sendt" });
});

afterEach(() => resetRememberedStatuses());

describe("stewardStatus (MET-A-015, #263)", () => {
  it("has no status before anything is reported", async () => {
    expect(await stewardStatus("token", 1, "7", { type: "current" })).toEqual({
      ok: true,
      own: null,
    });
  });

  it("reports on the way as a position report to the server", async () => {
    const result = await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station B",
    });
    expect(report).toHaveBeenCalledWith("token", "Station B");
    expect(result).toEqual({
      ok: true,
      own: { station: "Station B", status: "PENDING" },
    });
  });

  it("shows the server's refusal and keeps no status", async () => {
    report.mockResolvedValue({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
    });
    const result = await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station Z",
    });
    expect(result).toEqual({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
    });
    expect(await stewardStatus("token", 1, "7", { type: "current" })).toEqual({
      ok: true,
      own: null,
    });
  });

  it("lets the steward report a new station, like the server allows", async () => {
    await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station A",
    });
    await stewardStatus("token", 1, "7", { type: "arrive" });
    const result = await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station B",
    });
    expect(result).toEqual({
      ok: true,
      own: { station: "Station B", status: "PENDING" },
    });
  });

  it("confirms arrival in the app without sending anything", async () => {
    await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station B",
    });
    report.mockClear();
    const result = await stewardStatus("token", 1, "7", {
      type: "arrive",
    });
    expect(report).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      own: { station: "Station B", status: "MANNED" },
    });
  });

  it("rejects arrival when the steward is not on the way", async () => {
    const result = await stewardStatus("token", 1, "7", {
      type: "arrive",
    });
    expect(result).toMatchObject({
      ok: false,
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
    });
  });

  it("gives back the status after logging in again", async () => {
    await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station B",
    });
    await stewardStatus("token", 1, "7", { type: "arrive" });
    expect(
      await stewardStatus("other-token", 1, "7", { type: "current" }),
    ).toEqual({ ok: true, own: { station: "Station B", status: "MANNED" } });
  });

  it("keeps each steward and activation apart", async () => {
    await stewardStatus("token", 1, "7", {
      type: "assign",
      station: "Station B",
    });
    expect(await stewardStatus("token", 1, "8", { type: "current" })).toEqual({
      ok: true,
      own: null,
    });
    expect(await stewardStatus("token", 2, "7", { type: "current" })).toEqual({
      ok: true,
      own: null,
    });
  });
});
