import type { Db } from "../db/client.js";

// Matches contracts/v1/position-report.schema.json.
export type NewPositionReport = {
  staff: string;
  station: string;
  reportedAt: string; // ISO 8601 date-time
};

export type PositionReport = {
  id: string;
  staff: string;
  station: string;
  reportedAt: Date;
  receivedAt: Date;
};

export async function insertPositionReport(
  db: Db,
  report: NewPositionReport,
): Promise<PositionReport> {
  const [inserted] = await db<PositionReport[]>`
    INSERT INTO position_reports (staff, station, reported_at)
    VALUES (${report.staff}, ${report.station}, ${report.reportedAt})
    RETURNING *
  `;
  return inserted;
}
