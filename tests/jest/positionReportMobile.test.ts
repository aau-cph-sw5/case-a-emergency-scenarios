import { expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deliverPositionReport } from "../../mobile/src/api/position-report";
import { queuePositionReport } from "../../mobile/src/offline/queue-position-report";
import { positionReportQueueStore } from "../../mobile/src/offline/position-report-queue-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-crypto", () => ({
  randomUUID: () => "11111111-1111-4111-8111-111111111111",
}));

it("persists a report and handles delivery outcomes", async () => {
  const report = await queuePositionReport({
    userId: "1",
    station: "FL",
    scenarioId: "VAN-FB",
    activationId: 12,
  });

  expect(report.id).toBe("11111111-1111-4111-8111-111111111111");
  expect(report.activationId).toBe(12);
  expect(await positionReportQueueStore.getPending("1")).toEqual([report]);

  const fetchMock = jest.spyOn(global, "fetch");
  fetchMock
    .mockResolvedValueOnce({ status: 202 } as Response)
    .mockResolvedValueOnce({ status: 503 } as Response)
    .mockResolvedValueOnce({
      status: 409,
      json: async () => ({ error: { code: "E0005" } }),
    } as Response)
    .mockRejectedValueOnce(new TypeError("offline"));

  expect(await deliverPositionReport("token", report)).toEqual({
    status: "accepted",
  });
  expect(await deliverPositionReport("token", report)).toEqual({
    status: "retry",
  });
  expect(await deliverPositionReport("token", report)).toEqual({
    status: "rejected",
    httpStatus: 409,
    code: "E0005",
  });
  expect(await deliverPositionReport("token", report)).toEqual({
    status: "retry",
  });

  const [, options] = fetchMock.mock.calls[0];
  expect(JSON.parse(options?.body as string)).toMatchObject({
    id: report.id,
    reportedAt: report.reportedAt,
  });

  fetchMock.mockRestore();
  await AsyncStorage.clear();
});
