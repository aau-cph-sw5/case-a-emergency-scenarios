import type { Request, Response } from "express";
import type { Server } from "socket.io";
import {
  ERROR_CODES,
  errorBody,
  type ErrorCode,
} from "../../shared/error-codes.js";
import type { Role } from "../../shared/auth/roles.js";
import type { StewardStatusRequest } from "../../shared/types/v1/steward-status-request.js";
import { listActivations } from "../repositories/fixture-repository.js";
import type { AuthUser } from "../services/auth-service.js";
import {
  readAllStatuses,
  readOwnStatus,
  recordStewardStatus,
  type StatusOutcome,
} from "../services/steward-status-service.js";

// The response carries a message; the details go to the log.
function refuse(
  response: Response,
  status: number,
  code: ErrorCode,
  details: string,
  message?: string,
) {
  console.log(`Steward status refused (${code}):`, details);
  response.status(status).json(errorBody(code, message));
}

// The role check and the active activation, shared by the three calls.
// Undefined once the request has been refused.
function activeFor(response: Response, role: Role) {
  const user = response.locals.user as AuthUser;
  if (user.role !== role) {
    refuse(response, 403, ERROR_CODES.ROLE_NOT_PERMITTED, `role ${user.role}`);
    return undefined;
  }
  const [active] = listActivations("ACTIVE");
  if (active === undefined) {
    refuse(
      response,
      409,
      ERROR_CODES.NO_ACTIVE_SCENARIO,
      `user ${user.userId}`,
    );
    return undefined;
  }
  return { user, active };
}

// Shown to the steward, so it says what to do (as in the stub).
function invalidMessage(
  outcome: Extract<StatusOutcome, { result: "INVALID" }>,
  next: StewardStatusRequest,
) {
  if (outcome.concurrent) {
    return "Your status changed at the same time; read it again";
  }
  if (outcome.current === null) return "Assign yourself to a station first";
  const { status, station } = outcome.current;
  return `Cannot change from ${status} at ${station} to ${next.status} at ${next.station}`;
}

export async function getOwnStatus(_request: Request, response: Response) {
  const allowed = activeFor(response, "STEWARD");
  if (allowed === undefined) return;
  response.json(await readOwnStatus(allowed.user, allowed.active));
}

export async function putOwnStatus(request: Request, response: Response) {
  const allowed = activeFor(response, "STEWARD");
  if (allowed === undefined) return;
  const { user, active } = allowed;
  const next = request.body as StewardStatusRequest;

  // The stations of the active activation only; activeStations() covers
  // every activation.
  if (!active.deployments.some((d) => d.fulfills === next.station)) {
    return refuse(
      response,
      409,
      ERROR_CODES.STATION_NOT_IN_SCENARIO,
      next.station,
    );
  }

  const outcome = await recordStewardStatus(user, active, next);
  if (outcome.result === "INVALID") {
    return refuse(
      response,
      409,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `user ${user.userId} to ${next.status} at ${next.station}`,
      invalidMessage(outcome, next),
    );
  }

  // Told only after the change and its event are stored, and not on a repeat.
  if (outcome.result === "CHANGED") {
    const io = request.app.locals.io as Server | undefined;
    io?.to("OPERATOR").emit("steward-status-changed", outcome.status);
  }
  response.json(outcome.status);
}

export async function getAllStatuses(_request: Request, response: Response) {
  const allowed = activeFor(response, "OPERATOR");
  if (allowed === undefined) return;
  response.json(await readAllStatuses(allowed.active));
}
