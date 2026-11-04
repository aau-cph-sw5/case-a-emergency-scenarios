import * as Crypto from "expo-crypto"; //importing the Crypto module from the expo-crypto package for generating unique identifiers

import type { QueuedPositionReport } from "../../../shared/offline/position-report-queue";

import { positionReportQueueStore } from "./position-report-queue-store";

export type CreatePositionReportInput = {
  //represents the input required to create a new position report
  userId: string;
  station: string;
  scenarioId: string;
  activationId: number;
  taskDone?: boolean;
};

export async function queuePositionReport(
  input: CreatePositionReportInput,
): Promise<QueuedPositionReport> {
  const report: QueuedPositionReport = {
    ...input,
    id: Crypto.randomUUID(),
    reportedAt: new Date().toISOString(),
  };

  await positionReportQueueStore.enqueue(report); //saves the newly created report to the persistent queue for later delivery to the server

  return report;
}
