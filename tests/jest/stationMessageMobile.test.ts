import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { deliverStationMessage } from "../../mobile/src/api/station-message";
import {
  isSendableText,
  MAX_MESSAGE_LENGTH,
} from "../../mobile/src/data/station-thread";
import { queueStationMessage } from "../../mobile/src/offline/queue-station-message";
import { stationMessageQueueStore } from "../../mobile/src/offline/station-message-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-crypto", () => ({
  randomUUID: () => "22222222-2222-4222-8222-222222222222",
}));

const input = {
  userId: "1",
  station: "Kongens Nytorv",
  activationId: 12,
  text: "Vi mangler folk ved udgangen",
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("queueStationMessage", () => {
  it("saves the message on the phone with an id and the time written", async () => {
    const message = await queueStationMessage(input);

    expect(message.clientMessageId).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(Number.isNaN(Date.parse(message.writtenAt))).toBe(false);
    expect(await stationMessageQueueStore.getPending("1")).toContainEqual(
      message,
    );
  });

  it("refuses an empty or too long message instead of queueing it", async () => {
    await expect(
      queueStationMessage({ ...input, text: "   " }),
    ).rejects.toThrow();
    await expect(
      queueStationMessage({
        ...input,
        text: "a".repeat(MAX_MESSAGE_LENGTH + 1),
      }),
    ).rejects.toThrow();
  });

  it("counts characters, not UTF-16 units, like the server", () => {
    expect(isSendableText("😀".repeat(MAX_MESSAGE_LENGTH))).toBe(true);
    expect(isSendableText("😀".repeat(MAX_MESSAGE_LENGTH + 1))).toBe(false);
  });
});

describe("deliverStationMessage", () => {
  const message = {
    ...input,
    clientMessageId: "22222222-2222-4222-8222-222222222222",
    writtenAt: "2026-11-15T20:00:00.000Z",
  };
  const storedMessage = {
    id: 7,
    clientMessageId: message.clientMessageId,
    activationId: 12,
    station: "Kongens Nytorv",
    sender: "STATION",
    text: message.text,
    writtenAt: message.writtenAt,
    receivedAt: "2026-11-15T20:05:00.000Z",
  };

  it("posts to the station's thread with the contract's fields", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      status: 201,
      json: async () => storedMessage,
    } as Response);

    expect(await deliverStationMessage("token", message)).toEqual({
      status: "accepted",
      message: storedMessage,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(
      /\/api\/v1\/station-threads\/Kongens%20Nytorv\/messages$/,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      clientMessageId: message.clientMessageId,
      activationId: 12,
      text: message.text,
      writtenAt: message.writtenAt,
    });
  });

  it("treats a repeat the server already had as delivered", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      status: 200,
      json: async () => storedMessage,
    } as Response);
    expect(await deliverStationMessage("token", message)).toEqual({
      status: "accepted",
      message: storedMessage,
    });
  });

  it("asks for a retry on server errors, rate limits, and without connection", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ status: 503 } as Response)
      .mockResolvedValueOnce({ status: 429 } as Response)
      .mockRejectedValueOnce(new TypeError("offline"));
    expect(await deliverStationMessage("token", message)).toEqual({
      status: "retry",
    });
    expect(await deliverStationMessage("token", message)).toEqual({
      status: "retry",
    });
    expect(await deliverStationMessage("token", message)).toEqual({
      status: "retry",
    });
  });

  it("returns the server's code when it refuses the message", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      status: 409,
      json: async () => ({
        error: { code: "E1007", message: "Not checked in" },
      }),
    } as Response);
    expect(await deliverStationMessage("token", message)).toEqual({
      status: "rejected",
      httpStatus: 409,
      code: "E1007",
    });
  });

  it("returns HTTP 401 as rejected so the delivery layer can trigger session renewal", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      status: 401,
      json: async () => ({
        error: { code: "E2001", message: "Expired" },
      }),
    } as Response);
    expect(await deliverStationMessage("token", message)).toEqual({
      status: "rejected",
      httpStatus: 401,
      code: "E2001",
    });
  });
});
