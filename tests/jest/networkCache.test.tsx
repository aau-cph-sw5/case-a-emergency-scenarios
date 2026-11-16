import { renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getJson } from "../../shared/api/http";
import { NETWORK_STORAGE_KEY } from "../../shared/network/cache";
import { useNetwork } from "../../mobile/src/network/useNetwork";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock("../../shared/api/http", () => ({ getJson: jest.fn() }));

const saved = {
  stations: [
    { code: "A", name: "A", x: 12, y: 34 },
    { code: "B", name: "B", x: 56, y: 78 },
  ],
  segments: [{ id: 1, trackNumber: 1, stationA: "A", stationB: "B" }],
  normalPatterns: [
    {
      line: "M1",
      routeCode: "AB",
      operationType: "PENDULUM",
      maximumTrains: 1,
      did: "TEST",
      trackNumber: 1,
      stops: ["A", "B"],
    },
  ],
};

for (const line of ["M2", "M3", "M4"]) {
  saved.normalPatterns.push({ ...saved.normalPatterns[0], line });
}

beforeEach(() => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue();
});

describe("mobile network cache", () => {
  it("loads the last usable network while offline", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(saved));
    const { result } = renderHook(() => useNetwork("token", false));
    await waitFor(() =>
      expect(result.current.network?.positions.A).toEqual([12, 34]),
    );
    expect(result.current.usingCached).toBe(true);
    expect(getJson).not.toHaveBeenCalled();
  });

  it("fetches and saves a complete live network", async () => {
    jest.mocked(getJson).mockResolvedValue(saved);
    const { result } = renderHook(() => useNetwork("token", true));
    await waitFor(() =>
      expect(result.current.network?.positions.A).toEqual([12, 34]),
    );
    expect(result.current.usingCached).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      NETWORK_STORAGE_KEY,
      JSON.stringify(saved),
    );
  });

  it("keeps the cached network when the live response is incomplete", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(saved));
    jest
      .mocked(getJson)
      .mockResolvedValue({ stations: [], segments: [], normalPatterns: [] });
    const { result } = renderHook(() => useNetwork("token", true));
    await waitFor(() =>
      expect(result.current.network?.positions.A).toEqual([12, 34]),
    );
    await waitFor(() => expect(getJson).toHaveBeenCalled());
    expect(result.current.usingCached).toBe(true);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
