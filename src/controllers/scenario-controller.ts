import type { Request, Response } from "express";
import {
  findScenario,
  getScenarioState,
  listScenarios,
} from "../repositories/fixture-repository.js";

export function getScenarios(_request: Request, response: Response) {
  response.json(listScenarios());
}

export function getScenario(
  request: Request<{ scenarioId: string }>,
  response: Response,
) {
  const scenario = findScenario(request.params.scenarioId);
  if (scenario === undefined) {
    response.status(404).json({ error: "Scenario not found" });
    return;
  }
  response.json(scenario);
}

export function getCurrentScenarioState(_request: Request, response: Response) {
  response.json(getScenarioState());
}
