import type { Server } from "socket.io";
import type { Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";

import {
  ACTIVATION_STATUSES,
  type ActivationStatus,
  activateScenario,
  getScenarioState,
  listActivations,
} from "../repositories/fixture-repository.js";
import {
  findScenario,
  getAllScenarios,
} from "../repositories/scenario-repository.js";

export async function getScenarios(_request: Request, response: Response) {
  response.json(await getAllScenarios());
}

export async function getScenario(
  request: Request<{ scenarioId: string }>,
  response: Response,
) {
  const scenario = await findScenario(request.params.scenarioId);
  if (scenario === undefined) {
    response.status(404).json({ error: "Scenario not found" });
    return;
  }
  response.json(scenario);
}

export function getCurrentScenarioState(_request: Request, response: Response) {
  response.json(getScenarioState());
}

export function getActivations(request: Request, response: Response) {
  const { status } = request.query;
  if (status === undefined) {
    response.json(listActivations());
    return;
  }
  // A repeated or unknown status is refused, not silently treated as no filter.
  if (
    typeof status !== "string" ||
    !ACTIVATION_STATUSES.includes(status as ActivationStatus)
  ) {
    response
      .status(400)
      .json(
        errorBody(
          ERROR_CODES.INVALID_REQUEST,
          `status must be one of ${ACTIVATION_STATUSES.join(", ")}`,
        ),
      );
    return;
  }
  response.json(listActivations(status as ActivationStatus));
}

// Metro on MET-A-026: "All in CCR can activate a scenario". The full role
// matrix is #25's; this only keeps stewards out.
export async function activate(
  request: Request<{ scenarioId: string }>,
  response: Response,
) {
  const { userId, role } = response.locals.user;
  const { scenarioId } = request.params;

  if (role !== "OPERATOR") {
    response
      .status(403)
      .json(
        errorBody(
          ERROR_CODES.ROLE_NOT_PERMITTED,
          `Role ${role} may not activate a scenario`,
        ),
      );
    return;
  }

  const scenario = await findScenario(scenarioId);
  if (scenario === undefined) {
    response
      .status(404)
      .json(
        errorBody(
          ERROR_CODES.NOT_FOUND,
          `No scenario with id '${scenarioId}' exists`,
        ),
      );
    return;
  }

  const result = activateScenario(scenario, userId);
  if (result.kind === "already-active") {
    response
      .status(409)
      .json(
        errorBody(
          ERROR_CODES.CONFLICT,
          `Scenario '${scenarioId}' is already active`,
        ),
      );
  } else {
    // Push the whole activated scenario to the connected stewards.
    const io = request.app.locals.io as Server | undefined;
    if (!io) {
      console.warn("Socket.IO not attached; scenario-activated not sent");
    }
    io?.to("STEWARD").emit("scenario-activated", {
      scenario,
      sentAt: new Date().toISOString(),
    });
    console.log("Scenario activated:", result.activation);
    console.log(
      `scenario-activated sent to ${io?.sockets.adapter.rooms.get("STEWARD")?.size ?? 0} steward(s)`,
    );
    response.status(201).json(result.activation);
  }
}
