import type { SnapshotStorage } from "./scenario-snapshot";

export const POSITION_REPORT_QUEUE_KEY = "metro-pending-position-reports"; //stores the reports that have been queued for delivery to the server

export type QueuedPositionReport = {
  id: string; //stable id for duplicate detection
  userId: string; //what steward
  station: string; //station where the report was made
  reportedAt: string;
  scenarioId: string; //scenario the report wwas created against
  activationId: string; //specific activation the steward was participating in
  taskDone?: boolean;
};

export type PositionReportQueueStore = ReturnType<
  typeof createPositionReportQueueStore
>;

function isQueuedReport(value: unknown): value is QueuedPositionReport {
  //unknown type guard to check if the value is a QueuedPositionReport
  if (typeof value !== "object" || value === null) return false;

  const report = value as Record<string, unknown>; //cast value to a record with string keys and unknown types

  return (
    typeof report.id === "string" &&
    typeof report.userId === "string" &&
    typeof report.station === "string" &&
    typeof report.reportedAt === "string" &&
    !Number.isNaN(Date.parse(report.reportedAt)) &&
    typeof report.scenarioId === "string" &&
    typeof report.activationId === "string" &&
    (report.taskDone === undefined || typeof report.taskDone === "boolean")
  );
}

export function createPositionReportQueueStore(storage: SnapshotStorage) {
  //creates a store for queued position reports using storage mechanism
  let lastOperation: Promise<void> = Promise.resolve(); //keeps track of the last operation to ensure that operations are serialized

  // Operations run in order evenn when callers dont await eachother
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    //T is a generic type parameter that represents the type of the value that the operation returns
    const next = lastOperation.then(operation, operation); //operation runs twice because there are two possible callbacks, success and failure
    lastOperation = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function readQueue(): Promise<QueuedPositionReport[]> {
    const raw = await storage.getItem(POSITION_REPORT_QUEUE_KEY);

    if (raw === null) return []; //if there is no data in storage, return an empty array

    const parsed: unknown = JSON.parse(raw); //parse the raw data from storage into a JavaScript object

    if (!Array.isArray(parsed) || !parsed.every(isQueuedReport)) {
      throw new Error("Invalid stored position report queue");
    }

    return parsed;
  }

  async function saveQueue(reports: QueuedPositionReport[]): Promise<void> {
    //saves the queue of position reports to storage
    await storage.setItem(
      //store the reports in storage under the key POSITION_REPORT_QUEUE_KEY
      POSITION_REPORT_QUEUE_KEY,
      JSON.stringify(reports),
    );
  }

  return {
    enqueue(report: QueuedPositionReport): Promise<void> {
      //adds a new report to the queue
      return serialize(async () => {
        const reports = await readQueue();

        const existing = reports.find((item) => item.id === report.id);

        if (existing) {
          //if a report with the same id already exists in the queue, check if it is the same as the new report
          if (JSON.stringify(existing) !== JSON.stringify(report)) {
            throw new Error("Report ID already used for different data");
          }
          return;
        }

        await saveQueue([...reports, report]);
      });
    },

    getPending(userId: string): Promise<QueuedPositionReport[]> {
      //retrieves all pending reports for a specific user from the queue
      return serialize(async () => {
        const reports = await readQueue();
        return reports.filter((report) => report.userId === userId);
      });
    },

    acknowledge(userId: string, id: string): Promise<void> {
      //removes a report from the queue after it has been successfully delivered to the server
      return serialize(async () => {
        const reports = await readQueue();

        await saveQueue(
          reports.filter(
            (report) => !(report.userId === userId && report.id === id),
          ),
        );
      });
    },
  };
}
