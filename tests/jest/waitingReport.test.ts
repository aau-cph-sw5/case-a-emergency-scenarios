import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { positionReportQueueStore } from "../../mobile/src/offline/position-report-queue-store";
import { waitingReport } from "../../mobile/src/offline/waiting-report";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

function report(id: string, activationId: number, station: string) {
  return {
    id,
    userId: "7",
    station,
    reportedAt: "2026-11-12T10:00:00Z",
    scenarioId: "DEMO-001",
    activationId,
    event: "EN_ROUTE" as const,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("waiting position reports", () => {
  it("finds the newest waiting report for the activation only", async () => {
    await positionReportQueueStore.enqueue(report("a", 1, "Station B"));
    await positionReportQueueStore.enqueue(report("b", 1, "Station C"));
    await positionReportQueueStore.enqueue(report("c", 2, "Station G"));

    expect((await waitingReport("7", 1))?.id).toBe("b");
    expect((await waitingReport("7", 2))?.id).toBe("c");
    expect(await waitingReport("7", 3)).toBeNull();
    expect(await waitingReport("8", 1)).toBeNull();
  });
});
