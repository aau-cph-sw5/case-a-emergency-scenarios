import type { Request, Response } from "express";
import type { Server } from "socket.io";
import {
  ERROR_CODES,
  errorBody,
  type ErrorCode,
} from "../../shared/error-codes.js";
import { activeStations } from "../repositories/fixture-repository.js";
import type { AuthUser } from "../services/auth-service.js";

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
export function postPositionReport(request: Request, response: Response) {
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

  // Accepted: take staff from the token and forward the report to the operators.
  const report = { ...request.body, staff: userId };
  const io = request.app.locals.io as Server | undefined;
  io?.emit("position-report", { ...report, sentAt: new Date().toISOString() });

  console.log("Position report received:", report);
  response.status(202).json({ accepted: true });
}
