import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearStationChatRead,
  forgetStationChatRead,
  lastReadMessageId,
  markStationChatRead,
} from "../../mobile/src/offline/station-chat-read";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe("station chat read marker (MET-A-029, #446)", () => {
  it("returns null when nothing is stored", async () => {
    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();
  });

  it("returns the id only for the matching steward, activation and station", async () => {
    await markStationChatRead("7", 1, "Station B", 12);

    expect(await lastReadMessageId("7", 1, "Station B")).toBe(12);
    expect(await lastReadMessageId("8", 1, "Station B")).toBeNull();
    expect(await lastReadMessageId("7", 2, "Station B")).toBeNull();
    expect(await lastReadMessageId("7", 1, "Station C")).toBeNull();
  });

  it("never moves the marker backwards for the same thread", async () => {
    await markStationChatRead("7", 1, "Station B", 12);
    await markStationChatRead("7", 1, "Station B", 8);
    await markStationChatRead("7", 1, "Station B", 12);

    expect(await lastReadMessageId("7", 1, "Station B")).toBe(12);

    await markStationChatRead("7", 1, "Station B", 15);
    expect(await lastReadMessageId("7", 1, "Station B")).toBe(15);
  });

  it("replaces the marker when the steward reads another station or activation", async () => {
    await markStationChatRead("7", 1, "Station B", 12);
    await markStationChatRead("7", 1, "Station C", 3);

    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();
    expect(await lastReadMessageId("7", 1, "Station C")).toBe(3);

    await markStationChatRead("7", 2, "Station B", 1);
    expect(await lastReadMessageId("7", 1, "Station C")).toBeNull();
    expect(await lastReadMessageId("7", 2, "Station B")).toBe(1);
  });

  it("forgets markers of ended activations while keeping the live one", async () => {
    await markStationChatRead("7", 1, "Station B", 12);

    await forgetStationChatRead("7", 1);
    expect(await lastReadMessageId("7", 1, "Station B")).toBe(12);

    await forgetStationChatRead("7", 2);
    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();
    expect(await AsyncStorage.getItem("station-chat-read/7")).toBeNull();

    await markStationChatRead("7", 2, "Station B", 5);
    await forgetStationChatRead("7", null);
    expect(await lastReadMessageId("7", 2, "Station B")).toBeNull();
    expect(await AsyncStorage.getItem("station-chat-read/7")).toBeNull();
  });

  it("clears every steward's read marker without touching unrelated keys", async () => {
    await markStationChatRead("7", 1, "Station B", 12);
    await markStationChatRead("8", 1, "Station C", 4);
    await AsyncStorage.setItem(
      "station-chat-own/7/1/Station B",
      JSON.stringify(["abc"]),
    );

    await clearStationChatRead();

    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();
    expect(await lastReadMessageId("8", 1, "Station C")).toBeNull();
    expect(
      await AsyncStorage.getItem("station-chat-own/7/1/Station B"),
    ).toEqual(JSON.stringify(["abc"]));
  });

  it("reads damaged or unexpected values as null", async () => {
    await AsyncStorage.setItem("station-chat-read/7", "{not json");
    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();

    await AsyncStorage.setItem("station-chat-read/7", JSON.stringify(null));
    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();

    await AsyncStorage.setItem(
      "station-chat-read/7",
      JSON.stringify({
        activationId: "1",
        station: "Station B",
        lastReadId: 5,
      }),
    );
    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();

    await AsyncStorage.setItem(
      "station-chat-read/7",
      JSON.stringify({
        activationId: 1,
        station: "Station B",
        lastReadId: "5",
      }),
    );
    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();
  });

  it("does not fail when phone storage throws", async () => {
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValue(new Error("read failed"));
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValue(new Error("storage full"));
    jest
      .spyOn(AsyncStorage, "removeItem")
      .mockRejectedValue(new Error("remove failed"));
    jest
      .spyOn(AsyncStorage, "getAllKeys")
      .mockRejectedValue(new Error("keys failed"));

    expect(await lastReadMessageId("7", 1, "Station B")).toBeNull();
    await expect(
      markStationChatRead("7", 1, "Station B", 9),
    ).resolves.toBeUndefined();
    await expect(forgetStationChatRead("7", null)).resolves.toBeUndefined();
    await expect(clearStationChatRead()).resolves.toBeUndefined();
  });
});
