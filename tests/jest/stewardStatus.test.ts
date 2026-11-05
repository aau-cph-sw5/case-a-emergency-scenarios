import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { stewardStatus } from "../../mobile/src/data/steward-status";

const state = (deployments: object[]) => ({
  activationId: "ACT-1",
  deployments,
});
const fetchMock = jest.fn<typeof fetch>();
global.fetch = fetchMock;

function answer(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => fetchMock.mockReset());

describe("stewardStatus (MET-A-015, #265)", () => {
  it("assigns through the server and reads the steward's deployment", async () => {
    answer(
      200,
      state([{ status: "PENDING", staff: "7", fulfills: "Station B" }]),
    );
    const result = await stewardStatus("token", "ACT-1", "7", {
      type: "assign",
      station: "Station B",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/steward-status\/assign$/);
    expect(init?.body).toBe(JSON.stringify({ station: "Station B" }));
    expect(result).toEqual({
      ok: true,
      own: { station: "Station B", status: "PENDING" },
    });
  });

  it("checks in and out at their endpoints; check out leaves no status", async () => {
    answer(
      200,
      state([{ status: "MANNED", staff: "7", fulfills: "Station B" }]),
    );
    expect(
      await stewardStatus("token", "ACT-1", "7", { type: "arrive" }),
    ).toEqual({ ok: true, own: { station: "Station B", status: "MANNED" } });
    answer(
      200,
      state([{ status: "UNMANNED", staff: null, fulfills: "Station B" }]),
    );
    expect(
      await stewardStatus("token", "ACT-1", "7", { type: "checkout" }),
    ).toEqual({ ok: true, own: null });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/check-in$/),
      expect.stringMatching(/check-out$/),
    ]);
  });

  it("reads the current status from scenario-state, for this activation only", async () => {
    answer(
      200,
      state([{ status: "PENDING", staff: "7", fulfills: "Station B" }]),
    );
    expect(
      await stewardStatus("token", "ACT-2", "7", { type: "current" }),
    ).toEqual({ ok: true, own: null });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/scenario-state$/);
  });

  it("shows a refused change in Danish", async () => {
    answer(409, { error: { code: "E1006", message: "for developers" } });
    expect(
      await stewardStatus("token", "ACT-1", "7", { type: "arrive" }),
    ).toEqual({
      ok: false,
      code: "E1006",
      message: "Den status kan du ikke skifte til lige nu.",
    });
  });

  it("says so when the server cannot be reached", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(
      await stewardStatus("token", "ACT-1", "7", { type: "current" }),
    ).toEqual({ ok: false, message: "Ingen forbindelse til serveren." });
  });
});
