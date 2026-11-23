import { deliverPositionReport } from "../api/position-report";
import { createPositionReportDelivery } from "./position-report-delivery";
import { positionReportQueueStore } from "./position-report-queue-store";

export const positionReportDelivery = createPositionReportDelivery(
  positionReportQueueStore,
  deliverPositionReport,
);
