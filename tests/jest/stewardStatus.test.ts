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

const assign = (station: string, user = "7") =>
  stewardStatus("token", 1, user, { type: "assign", station });
const ask = (type: "arrive" | "cancel" | "checkOut") =>
  stewardStatus("token", 1, "7", { type });
const current = (user = "7", activation = 1) =>
  stewardStatus("token", activation, user, { type: "current" });

describe("stewardStatus (MET-A-015, #263, #305)", () => {
  it("has no status before anything is reported", async () => {
    expect(await current()).toEqual({ ok: true, own: null });
  });

  it("reports on the way with EN_ROUTE", async () => {
    expect(await assign("Station B")).toEqual({
      ok: true,
      own: { station: "Station B", status: "PENDING" },
    });
    expect(report).toHaveBeenCalledWith("token", "Station B", 1, "EN_ROUTE");
  });

  it("shows the server's refusal and keeps the status as it was", async () => {
    report.mockResolvedValue({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
    });
    expect(await assign("Station Z")).toEqual({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
    });
    expect(await current()).toEqual({ ok: true, own: null });
  });

  it("lets the steward change station while on the way", async () => {
    await assign("Station A");
    expect(await assign("Station B")).toEqual({
      ok: true,
      own: { station: "Station B", status: "PENDING" },
    });
  });

  it("sends arrival with ARRIVED at the station the steward is on the way to", async () => {
    await assign("Station B");
    report.mockClear();
    expect(await ask("arrive")).toEqual({
      ok: true,
      own: { station: "Station B", status: "MANNED" },
    });
    expect(report).toHaveBeenCalledWith("token", "Station B", 1, "ARRIVED");
  });

  it("stays on the way when arrival is refused", async () => {
    await assign("Station B");
    report.mockResolvedValue({ ok: false, message: "Ingen forbindelse." });
    expect(await ask("arrive")).toEqual({
      ok: false,
      message: "Ingen forbindelse.",
    });
    expect(await current()).toEqual({
      ok: true,
      own: { station: "Station B", status: "PENDING" },
    });
  });

  it("cancels while on the way with CANCELLED and leaves no status", async () => {
    await assign("Station B");
    report.mockClear();
    expect(await ask("cancel")).toEqual({ ok: true, own: null });
    expect(report).toHaveBeenCalledWith("token", "Station B", 1, "CANCELLED");
    expect(await current()).toEqual({ ok: true, own: null });
  });

  it("checks out after arriving with CHECKED_OUT and can go on the way again", async () => {
    await assign("Station A");
    await ask("arrive");
    report.mockClear();
    expect(await ask("checkOut")).toEqual({
      ok: true,
      own: { station: "Station A", status: "CHECKED_OUT" },
    });
    expect(report).toHaveBeenCalledWith("token", "Station A", 1, "CHECKED_OUT");
    expect(await assign("Station B")).toMatchObject({ ok: true });
  });

  it("rejects a new station after arriving until the steward checks out", async () => {
    await assign("Station A");
    await ask("arrive");
    report.mockClear();
    expect(await assign("Station B")).toEqual({
      ok: false,
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      message: "Tjek ud fra din station, før du melder dig til en ny.",
    });
    expect(report).not.toHaveBeenCalled();
  });

  it("rejects changes that do not follow from the status, without sending", async () => {
    for (const type of ["arrive", "cancel", "checkOut"] as const) {
      expect(await ask(type)).toMatchObject({
        ok: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      });
    }
    await assign("Station B");
    expect(await ask("checkOut")).toMatchObject({ ok: false });
    await ask("arrive");
    expect(await ask("cancel")).toMatchObject({ ok: false });
    expect(report).toHaveBeenCalledTimes(2);
  });

  it("gives back the status after logging in again", async () => {
    await assign("Station B");
    await ask("arrive");
    expect(
      await stewardStatus("other-token", 1, "7", { type: "current" }),
    ).toEqual({ ok: true, own: { station: "Station B", status: "MANNED" } });
  });

  it("keeps each steward and activation apart", async () => {
    await assign("Station B");
    expect(await current("8")).toEqual({ ok: true, own: null });
    expect(await current("7", 2)).toEqual({ ok: true, own: null });
  });

  describe("the server's status when the app has none (#310)", () => {
    const deployments = [
      {
        status: "MANNED" as const,
        staff: "7",
        fulfills: "Station B",
        reportedAt: "2026-11-08T10:00:00Z",
        arrivedAt: "2026-11-08T10:00:00Z",
      },
    ];
    const withServer = (request: Parameters<typeof stewardStatus>[3]) =>
      stewardStatus("token", 1, "7", request, deployments);

    it("uses the steward's own deployment after a reload", async () => {
      expect(await withServer({ type: "current" })).toEqual({
        ok: true,
        own: { station: "Station B", status: "MANNED" },
      });
    });

    it("checks a change against the server's status", async () => {
      expect(
        await withServer({ type: "assign", station: "Station C" }),
      ).toMatchObject({
        ok: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      });
      expect(report).not.toHaveBeenCalled();
      await withServer({ type: "checkOut" });
      expect(report).toHaveBeenLastCalledWith(
        "token",
        "Station B",
        "CHECKED_OUT",
      );
    });

    it("uses its own change until the next copy arrives", async () => {
      await assign("Station C");
      await withServer({ type: "arrive" });
      expect(report).toHaveBeenLastCalledWith("token", "Station C", "ARRIVED");
    });

    // The same account changed status on another phone (#310).
    it("takes a new copy from the server over what it remembers", async () => {
      await assign("Station C");
      expect(await withServer({ type: "current" })).toEqual({
        ok: true,
        own: { station: "Station B", status: "MANNED" },
      });
    });

    it("passes the server's refusal on, and the next copy corrects it", async () => {
      await assign("Station C");
      report.mockResolvedValue({
        ok: false,
        message: "Din status er ændret et andet sted.",
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      });
      expect(await ask("arrive")).toMatchObject({
        ok: false,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      });
      expect(await withServer({ type: "current" })).toEqual({
        ok: true,
        own: { station: "Station B", status: "MANNED" },
      });
    });
  });
});
