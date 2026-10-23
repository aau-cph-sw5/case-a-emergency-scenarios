import type { Request, Response } from "express";
import type { Server } from "socket.io";
import {
  ERROR_CODES,
  errorBody,
  type ErrorCode,
} from "../../shared/error-codes.js";
import { activeStations } from "../repositories/fixture-repository.js";
import type { AuthUser } from "../services/auth-service.js";
import { recordPositionReport } from "../services/position-report-service.js";

// The response carries the code's fixed message; the details go to the log.
function refuse(
  response: Response,
  status: number,
  code: ErrorCode,
  details: string,
) {
  console.log(`Position report refused (${code}):`, details);
  response.status(status).json(errorBody(code));
}

/* Refuse emit to the operators if request was not sent by a steward and if the station
Reported in the postionreport is not part of the active scenario */
export async function postPositionReport(request: Request, response: Response) {
  const { userId, role } = response.locals.user as AuthUser;
  const { station } = request.body;
  const stations = activeStations();

  if (role !== "STEWARD") {
    return refuse(
      response,
      403,
      ERROR_CODES.ROLE_NOT_PERMITTED,
      `role ${role}`,
    );
  }
  if (stations.size === 0) {
    return refuse(response, 409, ERROR_CODES.NO_ACTIVE_SCENARIO, station);
  }
  if (!stations.has(station)) {
    return refuse(response, 409, ERROR_CODES.STATION_NOT_IN_SCENARIO, station);
  }

  // Accepted: take staff from the token and the time from the server's clock, so
  // a phone with a wrong clock cannot reorder reports. Store the report and its
  // event first, so the operators are never told about a report that was lost.
  const now = new Date().toISOString();
  // The phone's own time, for the event log, before reportedAt is replaced.
  const clientTime = new Date(request.body.reportedAt);
  const report = { ...request.body, staff: userId, reportedAt: now };
  await recordPositionReport(response.locals.user, report, clientTime);

  const io = request.app.locals.io as Server | undefined;
  io?.to("OPERATOR").emit("position-report", { ...report, sentAt: now });
  response.status(202).json({ accepted: true });
}