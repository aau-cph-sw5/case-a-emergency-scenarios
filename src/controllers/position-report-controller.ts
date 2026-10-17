import type { Request, Response } from "express";
import { recordPositionReport } from "../services/position-report-service.js";

// The body has already been checked against position-report.schema.json.
export async function postPositionReport(request: Request, response: Response) {
  await recordPositionReport(response.locals.user, request.body);
  response.status(202).json({ accepted: true });
}
