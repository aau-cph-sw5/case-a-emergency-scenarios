import { renderHook, waitFor, act } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { useNetwork } from "../../web/src/data/useNetwork";
import { getJson } from "../../web/src/get-json";
import { network } from "../helpers/network";

jest.mock("../../web/src/get-json", () => ({
  getJson: jest.fn(),
  userMessage: () => "Network unavailable",
}));

describe("web network loading", () => {
  it("loads the network with the current token", async () => {
    jest.mocked(getJson).mockResolvedValue(network);
    const { result } = renderHook(() => useNetwork("operator-token"));
    await waitFor(() =>
      expect(result.current.network?.positions["Station A"]).toEqual([
        100, 200,
      ]),
    );
    expect(getJson).toHaveBeenCalledWith(
      "/api/v1/network",
      "operator-token",
      expect.any(Function),
      expect.anything(),
    );
  });

  it("shows a failure and allows retry", async () => {
    jest
      .mocked(getJson)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(network);
    const { result } = renderHook(() => useNetwork("operator-token"));
    await waitFor(() =>
      expect(result.current.error).toBe("Network unavailable"),
    );
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.network?.positions["Station A"]).toEqual([
        100, 200,
      ]),
    );
    expect(result.current.error).toBeNull();
  });
});
