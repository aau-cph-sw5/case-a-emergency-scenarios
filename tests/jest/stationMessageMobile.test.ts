import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import * as Crypto from "expo-crypto";
import {
  deliverStationMessage,
  messageErrorMessage,
} from "../../mobile/src/api/station-message";
import {
  MAX_MESSAGE_LENGTH,
  isSendableText,
  queueStationMessage,
  writeStationMessage,
} from "../../mobile/src/offline/queue-station-message";
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

describe("writeStationMessage", () => {
  // Each message gets its own id, so the tests do not see each other's messages.
  let next = 0;
  beforeEach(() => {
    jest
      .spyOn(Crypto, "randomUUID")
      .mockImplementation(
        () => `33333333-3333-4333-8333-${String(++next).padStart(12, "0")}`,
      );
  });

  it("sends the message at once while the phone is online", async () => {
    jest.spyOn(global, "fetch").mockImplementation(
      async (_url, init) =>
        ({
          status: 201,
          json: async () => ({
            ...JSON.parse((init as RequestInit).body as string),
            id: 1,
            station: input.station,
            sender: "STATION",
            receivedAt: "2026-11-17T10:00:00.000Z",
          }),
        }) as Response,
    );

    const { message, sent } = await writeStationMessage(
      { ...input, userId: "online" },
      "token",
    );

    expect(sent?.delivered.map((item) => item.clientMessageId)).toEqual([
      message.clientMessageId,
    ]);
    expect(await stationMessageQueueStore.getPending("online")).toEqual([]);
  });

  it("keeps the message queued when there is no connection", async () => {
    jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new TypeError("Network request failed"));

    const { message, sent } = await writeStationMessage(
      { ...input, userId: "offline" },
      "token",
    );

    expect(sent?.blocked).toBe(true);
    expect(await stationMessageQueueStore.getPending("offline")).toEqual([
      message,
    ]);
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

  it("asks for a retry on server errors and without connection", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ status: 503 } as Response)
      .mockRejectedValueOnce(new TypeError("offline"));
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
});

describe("messageErrorMessage", () => {
  it("explains a refusal to the steward", () => {
    expect(messageErrorMessage("E1007")).toMatch(/ikke tjekket ind/);
    expect(messageErrorMessage("E1003")).toMatch(/stoppet/);
    expect(messageErrorMessage("unknown")).toBe("Beskeden blev ikke sendt.");
    expect(messageErrorMessage()).toBe("Beskeden blev ikke sendt.");
  });
});
