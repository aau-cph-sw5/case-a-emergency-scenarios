import type { Request, Response } from "express";
import type { Server } from "socket.io";
import {
  ERROR_CODES,
  errorBody,
  type ErrorCode,
} from "../../shared/error-codes.js";
import {
  findActivation,
  listActivations,
} from "../repositories/activation-repository.js";
import type { AuthUser } from "../services/auth-service.js";
import {
  checkPositionReportReplay,
  recordPositionReport,
} from "../services/position-report-service.js";

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
  const { station, activationId } = request.body;

  if (role !== "STEWARD") {
    return refuse(
      response,
      403,
      ERROR_CODES.ROLE_NOT_PERMITTED,
      `role ${role}`,
    );
  }
  const clientTime = new Date(request.body.reportedAt);
  const replay = await checkPositionReportReplay(
    response.locals.user,
    request.body,
    clientTime,
  );

  if (replay === "repeat") {
    return response.status(202).json({ accepted: true });
  }

  if (replay === "conflict") {
    return refuse(
      response,
      409,
      ERROR_CODES.CONFLICT,
      "Client report ID reused for a different action",
    );
  }
  const activation = await findActivation(activationId);
  if (activation?.status !== "ACTIVE") {
    if (
      activation === undefined &&
      (await listActivations("ACTIVE")).length === 0
    ) {
      return refuse(response, 409, ERROR_CODES.NO_ACTIVE_SCENARIO, station);
    }
    return refuse(
      response,
      409,
      ERROR_CODES.SCENARIO_STOOD_DOWN,
      `activation ${activationId}`,
    );
  }
  if (!activation.deployments.some((item) => item.fulfills === station)) {
    return refuse(response, 409, ERROR_CODES.STATION_NOT_IN_SCENARIO, station);
  }

  // Accepted: take staff from the token and the time from the server's clock, so
  // a phone with a wrong clock cannot reorder reports. Store the report and its
  // event first, so the operators are never told about a report that was lost.
  const now = new Date().toISOString();
  const report = { ...request.body, staff: userId, reportedAt: now };
  const result = await recordPositionReport(
    response.locals.user,
    report,
    clientTime,
    activation.startedAt,
  );
  if (result.kind === "conflict") {
    return refuse(
      response,
      409,
      ERROR_CODES.CONFLICT,
      "Client report ID reused for a different action",
    );
  }
  if (result.kind === "invalid") {
    return refuse(
      response,
      409,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `${report.taskDone === true ? "task done" : (report.event ?? "EN_ROUTE")} at ${station}, latest report at ${result.latestStation}`,
    );
  }
  // A repeat changes nothing, so the operators are not told again.
  if (result.kind === "repeat") {
    return response.status(202).json({ accepted: true });
  }

  const io = request.app.locals.io as Server | undefined;
  io?.to("OPERATOR").emit("position-report", { ...report, sentAt: now });
  // The deployments changed, so the control room loads the activations again,
  // and the stewards' phones the active scenario, so their coverage and map
  // follow other stewards' reports too (#310).
  io?.to("OPERATOR").emit("activations-changed");
  io?.to("STEWARD").emit("activations-changed");
  response.status(202).json({ accepted: true });
}
