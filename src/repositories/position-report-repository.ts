import type { Db } from "../db/client.js";
// The request body, generated from contracts/v1/position-report.schema.json.
import type { PositionReport as NewPositionReport } from "../../shared/types/v1/position-report.js";

export type { NewPositionReport };

// A row of position_reports, not to be confused with the request body.
export type StoredPositionReport = {
  id: string;
  staff: string;
  station: string;
  reportedAt: Date;
  receivedAt: Date;
  // The activation the report was made against.
  activationId: number;
  taskDone: boolean;
  event: ReportEvent;
  clientReportId: string | null;
  clientRequestHash: string | null;
};

export type ReportEvent = NonNullable<NewPositionReport["event"]>;

export async function insertPositionReport(
  db: Db,
  report: NewPositionReport,
  requestHash: string | null = null,
): Promise<StoredPositionReport> {
  const [inserted] = await db<StoredPositionReport[]>`
    INSERT INTO position_reports
      (staff, station, reported_at, activation_id, task_done, event, client_report_id, client_request_hash)
    VALUES (${report.staff}, ${report.station}, ${report.reportedAt}, ${report.activationId},
            ${report.taskDone ?? false}, ${report.event ?? "EN_ROUTE"},
            ${report.id ?? null}, ${requestHash})
    RETURNING *
  `;
  return inserted;
}

// The steward's latest report since the activation started, to check the next
// report against (MET-A-015).
export async function findLatestReport(
  db: Db,
  staff: string,
  since: string,
): Promise<StoredPositionReport | null> {
  const [latest] = await db<StoredPositionReport[]>`
    SELECT * FROM position_reports
    WHERE staff = ${staff} AND received_at >= ${since}
    ORDER BY received_at DESC
    LIMIT 1
  `;
  return latest ?? null;
}

// Find a report by the client-generated ID, to detect duplicates.
export async function findByClientReportId(
  db: Db,
  id: string,
): Promise<StoredPositionReport | null> {
  const [report] = await db<StoredPositionReport[]>`
    SELECT *
    FROM position_reports
    WHERE client_report_id = ${id}
  `;

  return report ?? null;
}
