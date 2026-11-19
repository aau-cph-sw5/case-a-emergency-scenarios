import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ownMessageIds,
  rememberOwnMessage,
} from "../../mobile/src/offline/own-station-messages";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe("own station messages (MET-A-029, #335)", () => {
  it("remembers the ids in lower case, per steward, activation and station", async () => {
    await rememberOwnMessage("7", 1, "Station B", "ABC-1");
    await rememberOwnMessage("7", 1, "Station B", "abc-2");

    expect(await ownMessageIds("7", 1, "Station B")).toEqual(
      new Set(["abc-1", "abc-2"]),
    );
    expect(await ownMessageIds("8", 1, "Station B")).toEqual(new Set());
    expect(await ownMessageIds("7", 2, "Station B")).toEqual(new Set());
    expect(await ownMessageIds("7", 1, "Station C")).toEqual(new Set());
  });

  it("reads a damaged list as empty", async () => {
    await AsyncStorage.setItem("station-chat-own/7/1/Station B", "{not json");
    expect(await ownMessageIds("7", 1, "Station B")).toEqual(new Set());

    await AsyncStorage.setItem(
      "station-chat-own/7/1/Station B",
      JSON.stringify({ id: "abc" }),
    );
    expect(await ownMessageIds("7", 1, "Station B")).toEqual(new Set());

    await AsyncStorage.setItem(
      "station-chat-own/7/1/Station B",
      JSON.stringify(["abc", 4]),
    );
    expect(await ownMessageIds("7", 1, "Station B")).toEqual(new Set(["abc"]));
  });

  it("does not fail when the phone cannot store the list", async () => {
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValue(new Error("storage full"));

    await expect(
      rememberOwnMessage("7", 1, "Station B", "abc"),
    ).resolves.toBeUndefined();
    expect(await ownMessageIds("7", 1, "Station B")).toEqual(new Set());
  });
});
