import { Router } from "express";
import {
  getCurrentScenarioState,
  getScenario,
  getScenarios,
} from "../controllers/scenario-controller.js";

export const scenarioRouter = Router();

scenarioRouter.get("/api/v1/scenarios", getScenarios);
scenarioRouter.get("/api/v1/scenarios/:scenarioId", getScenario);
scenarioRouter.get("/api/v1/scenario-state", getCurrentScenarioState);
