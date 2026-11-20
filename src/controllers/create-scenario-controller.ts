import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { roleRoom } from "../realtime/socket-server.js";
import type { CreateScenarioRequest } from "../../shared/types/v1/create-scenario-request.js";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import {
  createScenario,
  InvalidScenarioData,
} from "../repositories/create-scenario-repository.js";

export async function createScenarioHandler(
  request: Request,
  response: Response,
) {
  const input = request.body as CreateScenarioRequest;
  try {
    await createScenario(input);
    try {
      const io = request.app.locals.io as Server | undefined;
      io?.to(roleRoom("OPERATOR", input.lineGroup)).emit("scenarios-changed");
    } catch (error) {
      console.error("Could not notify operators of the new scenario:", error);
    }
    response.status(201).json({ scenarioId: input.scenarioId.trim() });
  } catch (error) {
    if (error instanceof InvalidScenarioData) {
      response
        .status(400)
        .json(errorBody(ERROR_CODES.INVALID_REQUEST, error.message));
      return;
    }
    if ((error as { code?: string })?.code === "23505") {
      response
        .status(409)
        .json(errorBody(ERROR_CODES.CONFLICT, "Scenario ID already exists."));
      return;
    }
    throw error;
  }
}
