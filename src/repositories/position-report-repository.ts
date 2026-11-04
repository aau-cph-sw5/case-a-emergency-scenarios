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
  requestFingerprint: string | null;
};

export async function insertPositionReport(
  db: Db,
  report: NewPositionReport,
  requestFingerprint: string,
): Promise<StoredPositionReport | null> {
  const [inserted] = await db<StoredPositionReport[]>`
    INSERT INTO position_reports (
      id,
      staff,
      station,
      reported_at,
      request_fingerprint
    )
    VALUES (
      ${report.id},
      ${report.staff},
      ${report.station},
      ${report.reportedAt},
      ${requestFingerprint}
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;

  return inserted ?? null;
}

export async function findPositionReportById( // Finds a position report by its unique ID. Returns null if not found.
  db: Db,
  id: string,
): Promise<StoredPositionReport | null> {
  const [report] = await db<StoredPositionReport[]>`
    SELECT *
    FROM position_reports
    WHERE id = ${id}
  `;

  return report ?? null;
}
