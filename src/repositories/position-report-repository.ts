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
  taskDone: boolean;
  clientReportId: string | null;
  clientRequestHash: string | null;
};

export async function insertPositionReport(
  db: Db,
  report: NewPositionReport,
  requestHash: string | null = null,
): Promise<StoredPositionReport> {
  const [inserted] = await db<StoredPositionReport[]>`
    INSERT INTO position_reports
      (staff, station, reported_at, task_done, client_report_id, client_request_hash)
    VALUES (${report.staff}, ${report.station}, ${report.reportedAt},
            ${report.taskDone ?? false}, ${report.id ?? null}, ${requestHash})
    RETURNING *
  `;
  return inserted;
}

// The steward's latest report since the activation started, to check a task
// done against (MET-A-015).
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
export async function findByClientReportId( // Find a report by the client-generated ID, to detect duplicates
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
