import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  closesThread,
  isSendableText,
  NO_CONNECTION,
  readStationThread,
  SERVER_FAILED,
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

const validThread = {
  activationId: 1,
  station: "Station B",
  state: "UNANSWERED" as const,
  unansweredSince: stored.receivedAt,
  lastMessageAt: stored.receivedAt,
  stationMessageIds: [stored.id],
  messages: [stored],
};

function answer(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => jest.restoreAllMocks());

// Reads one station's thread from the server (MET-A-029, #335, #445).
describe("readStationThread", () => {
  it("reads the station's thread with the steward's token", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(answer(200, validThread));

    const result = await readStationThread("token", "Station B");

    expect(result).toEqual({ ok: true, value: validThread });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/station-threads\/Station%20B$/);
    expect(options?.headers).toEqual({ Authorization: "Bearer token" });
  });

  it("rejects schema-invalid thread responses", async () => {
    const invalidBodies: unknown[] = [
      { station: "Station B", messages: [stored] },
      { ...validThread, state: "CLOSED" },
      { ...validThread, messages: [{ ...stored, sender: "STEWARD" }] },
      {
        ...validThread,
        messages: [{ ...stored, clientMessageId: "not-a-uuid" }],
      },
      { ...validThread, state: "ANSWERED" },
      {
        activationId: 1,
        station: "Station B",
        state: "ANSWERED",
        unansweredSince: null,
        lastMessageAt: null,
      },
    ];

    for (const body of invalidBodies) {
      jest.spyOn(global, "fetch").mockResolvedValueOnce(answer(200, body));
      const result = await readStationThread("token", "Station B");
      expect(result).toEqual({ ok: false, message: SERVER_FAILED });
    }
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

    const result = await readStationThread("token", "Station B");

    expect(result).toEqual({
      ok: false,
      code: ERROR_CODES.NOT_CHECKED_IN_AT_STATION,
      message: "Du er ikke tjekket ind på stationen.",
    });
  });

  it("explains server errors (5xx) with the fallback message", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(answer(500, { error: { code: "E9999" } }));

    const result = await readStationThread("token", "Station B");

    expect(result).toEqual({
      ok: false,
      code: "E9999",
      message: SERVER_FAILED,
    });
  });

  it("explains an expired session (401)", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      answer(401, {
        error: { code: ERROR_CODES.AUTH_TOKEN_INVALID, message: "Expired" },
      }),
    );

    const result = await readStationThread("token", "Station B");

    expect(result).toEqual({
      ok: false,
      code: ERROR_CODES.AUTH_TOKEN_INVALID,
      message: "Din session er udløbet. Log ind igen.",
    });
  });

  it("says when the server could not be reached", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("offline"));

    const result = await readStationThread("token", "Station B");

    expect(result).toEqual({
      ok: false,
      message: NO_CONNECTION,
    });
  });

  it("treats an unreadable response body like no connection", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new TypeError("Network request failed");
      },
    } as unknown as Response);

    const result = await readStationThread("token", "Station B");

    expect(result).toEqual({
      ok: false,
      message: NO_CONNECTION,
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
