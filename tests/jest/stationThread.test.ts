import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  closesThread,
  isSendableText,
  NO_CONNECTION,
  SERVER_FAILED,
  stationThread,
} from "../../mobile/src/data/station-thread";
import { ERROR_CODES } from "../../shared/error-codes";
import type { StationMessage } from "../../shared/types/v1/station-message";

const stored: StationMessage = {
  id: 3,
  clientMessageId: "6f1c2f0e-4a53-4a0e-9d0b-2f8c7c1f5b11",
  activationId: 1,
  station: "Station B",
  sender: "STATION",
  text: "Elevatoren er ude af drift.",
  writtenAt: "2026-11-17T08:20:00Z",
  receivedAt: "2026-11-17T08:20:01Z",
};

function answer(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => jest.restoreAllMocks());

// The one data function of the steward's chat (MET-A-029, #335).
describe("stationThread", () => {
  it("reads the station's thread with the steward's token", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        answer(200, { station: "Station B", messages: [stored] }),
      );

    const result = await stationThread("token", "Station B", {
      type: "read",
    });

    expect(result).toMatchObject({ ok: true, value: { messages: [stored] } });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/station-threads\/Station%20B$/);
    expect(options?.headers).toEqual({ Authorization: "Bearer token" });
  });

  it("sends a message with the fields of the contract and nothing else", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(answer(201, stored));

    const result = await stationThread("token", "Station B", {
      type: "send",
      clientMessageId: stored.clientMessageId,
      activationId: 1,
      text: stored.text,
      writtenAt: stored.writtenAt,
    });

    expect(result).toEqual({ ok: true, value: stored });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/station-threads\/Station%20B\/messages$/);
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options?.body as string)).toEqual({
      clientMessageId: stored.clientMessageId,
      activationId: 1,
      text: stored.text,
      writtenAt: stored.writtenAt,
    });
  });

  it("counts a repeat the server already had (200) as sent", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(answer(200, stored));

    const result = await stationThread("token", "Station B", {
      type: "send",
      clientMessageId: stored.clientMessageId,
      activationId: 1,
      text: stored.text,
      writtenAt: stored.writtenAt,
    });

    expect(result).toEqual({ ok: true, value: stored });
  });

  it("gives the server's refusal in Danish with its code", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      answer(409, {
        error: {
          code: ERROR_CODES.NOT_CHECKED_IN_AT_STATION,
          message: "The steward is not checked in at the station",
        },
      }),
    );

    const result = await stationThread("token", "Station B", {
      type: "read",
    });

    expect(result).toEqual({
      ok: false,
      code: ERROR_CODES.NOT_CHECKED_IN_AT_STATION,
      message: "Du er ikke tjekket ind på stationen.",
      offline: false,
      retry: false,
    });
  });

  it("drops a message the server finds invalid (400) without retrying", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      answer(400, {
        error: { code: ERROR_CODES.MISSING_PARAMETER, message: "Bad text" },
      }),
    );

    const result = await stationThread("token", "Station B", {
      type: "send",
      clientMessageId: stored.clientMessageId,
      activationId: 1,
      text: stored.text,
      writtenAt: stored.writtenAt,
    });

    expect(result).toMatchObject({ ok: false, retry: false });
  });

  it("retries when the server fails (5xx)", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(answer(500, { error: { code: "E9999" } }));

    const result = await stationThread("token", "Station B", {
      type: "send",
      clientMessageId: stored.clientMessageId,
      activationId: 1,
      text: stored.text,
      writtenAt: stored.writtenAt,
    });

    expect(result).toEqual({
      ok: false,
      code: "E9999",
      message: SERVER_FAILED,
      offline: false,
      retry: true,
    });
  });

  it("retries an expired session (401) once it is renewed", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      answer(401, {
        error: { code: ERROR_CODES.AUTH_TOKEN_INVALID, message: "Expired" },
      }),
    );

    const result = await stationThread("token", "Station B", {
      type: "read",
    });

    expect(result).toEqual({
      ok: false,
      code: ERROR_CODES.AUTH_TOKEN_INVALID,
      message: "Din session er udløbet. Log ind igen.",
      offline: false,
      retry: true,
    });
  });

  it("says when the server could not be reached", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("offline"));

    const result = await stationThread("token", "Station B", {
      type: "read",
    });

    expect(result).toEqual({
      ok: false,
      message: NO_CONNECTION,
      offline: true,
      retry: true,
    });
  });
});

describe("closesThread", () => {
  it("closes the chat for the refusals that end the steward's thread", () => {
    expect(closesThread(ERROR_CODES.NOT_CHECKED_IN_AT_STATION)).toBe(true);
    expect(closesThread(ERROR_CODES.SCENARIO_STOOD_DOWN)).toBe(true);
    expect(closesThread(ERROR_CODES.NO_ACTIVE_SCENARIO)).toBe(true);
    expect(closesThread(ERROR_CODES.STATION_NOT_IN_SCENARIO)).toBe(true);
    expect(closesThread(ERROR_CODES.MISSING_PARAMETER)).toBe(false);
    expect(closesThread(undefined)).toBe(false);
  });
});

describe("isSendableText", () => {
  it("needs text that is not only whitespace", () => {
    expect(isSendableText("Hej")).toBe(true);
    expect(isSendableText("   \n")).toBe(false);
  });

  it("counts characters as code points, as the contract does", () => {
    // Each emoji is two UTF-16 units but one code point.
    expect(isSendableText("😀".repeat(1000))).toBe(true);
    expect(isSendableText("😀".repeat(1001))).toBe(false);
  });
});
