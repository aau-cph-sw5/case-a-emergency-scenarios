import { deliverPositionReport } from "../api/position-report"; //sending position reports to the server and handling the response

import { createPositionReportDelivery } from "./position-report-delivery"; //creating a position report delivery mechanism that handles flushing queued reports to the server

import { positionReportQueueStore } from "./position-report-queue-store"; //persistent storage for queued position reports, allowing them to be saved and retrieved across app sessions

export const positionReportDelivery = createPositionReportDelivery //creating a position report delivery mechanism that handles flushing queued reports to the server, using the persistent queue and the deliverPositionReport function
(
  positionReportQueueStore,
  deliverPositionReport,
);