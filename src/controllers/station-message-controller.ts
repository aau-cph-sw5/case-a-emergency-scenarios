import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request.js";
import { emitStationMessage } from "../realtime/station-messages.js";
import type { AuthUser } from "../services/auth-service.js";
import {
  createStationMessage,
  listStationThreads,
  readStationThread,
} from "../services/station-message-service.js";
import { notifyStationMessage } from "../services/push-service.js";

// Role refusals use 403; other refusals mean the current state conflicts (409).
function refuse(response: Response, code: string) {
  const status = code === ERROR_CODES.ROLE_NOT_PERMITTED ? 403 : 409;
  return response.status(status).json(errorBody(code as never));
}

export async function getStationThreads(_request: Request, response: Response) {
  // requireAuth puts the user from the verified token in response.locals.
  const user = response.locals.user as AuthUser;
  if (user.role !== "OPERATOR") {
    return refuse(response, ERROR_CODES.ROLE_NOT_PERMITTED);
  }

  return response.json(await listStationThreads(user));
}

export async function getStationThread(
  request: Request<{ station: string }>,
  response: Response,
) {
  const user = response.locals.user as AuthUser;
  if (user.role !== "STEWARD" && user.role !== "OPERATOR") {
    return refuse(response, ERROR_CODES.ROLE_NOT_PERMITTED);
  }

  const result = await readStationThread(user, request.params.station);
  // The kind tag distinguishes a refusal from the thread returned on success.
  if ("kind" in result && result.kind === "refused") {
    return refuse(response, result.code);
  }

  return response.json(result);
}

export async function postStationMessage(
  request: Request<{ station: string }>,
  response: Response,
) {
  const user = response.locals.user as AuthUser;
  if (user.role !== "STEWARD" && user.role !== "OPERATOR") {
    return refuse(response, ERROR_CODES.ROLE_NOT_PERMITTED);
  }

  const result = await createStationMessage(
    user,
    request.params.station,
    request.body as StationMessageRequest,
  );

  if (result.kind === "refused") {
    return refuse(response, result.code);
  }

  // A new message goes live to the operators in its line group and the
  // stewards checked in at the station (#334). A repeat was sent the first
  // time, so it is not sent again.
  if (result.kind === "created") {
    const io = request.app.locals.io as Server | undefined;
    if (io) {
      emitStationMessage(io, result.lineGroup, result.message, result.thread);
    }
    void notifyStationMessage(
      result.message.activationId,
      result.message.station,
      user.role === "STEWARD" ? user.userId : null,
    );
  }

  return (
    response
      // A retry is acknowledged with 200; a newly stored message returns 201.
      .status(result.kind === "repeat" ? 200 : 201)
      .json(result.message)
  );
}
