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
};

export async function insertPositionReport(
  db: Db,
  report: NewPositionReport,
): Promise<StoredPositionReport> {
  const [inserted] = await db<StoredPositionReport[]>`
    INSERT INTO position_reports (staff, station, reported_at)
    VALUES (${report.staff}, ${report.station}, ${report.reportedAt})
    RETURNING *
  `;
  return inserted;
}