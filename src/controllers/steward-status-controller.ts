import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { AssignRequest } from "../../shared/types/v1/assign-request.js";
import type { AuthUser } from "../services/auth-service.js";
import {
  changeStewardStatus,
  type StewardAction,
} from "../services/steward-status-service.js";

// One handler per action: assign, check in, check out (MET-A-015).
export function stewardStatusHandler(action: StewardAction) {
  return async (request: Request, response: Response) => {
    const user = response.locals.user as AuthUser;
    if (user.role !== "STEWARD") {
      response.status(403).json(errorBody(ERROR_CODES.ROLE_NOT_PERMITTED));
      return;
    }

    const { station } = (request.body ?? {}) as Partial<AssignRequest>;
    const result = await changeStewardStatus(user, action, station);
    if (result.kind === "no-active-scenario") {
      response.status(409).json(errorBody(ERROR_CODES.NO_ACTIVE_SCENARIO));
    } else if (result.kind === "station-not-in-scenario") {
      response.status(409).json(errorBody(ERROR_CODES.STATION_NOT_IN_SCENARIO));
    } else if (result.kind === "invalid") {
      response
        .status(409)
        .json(errorBody(ERROR_CODES.INVALID_STATUS_TRANSITION, result.reason));
    } else {
      const io = request.app.locals.io as Server | undefined;
      io?.to("OPERATOR").emit("activations-changed");
      response.json(result.activation);
    }
  };
}
