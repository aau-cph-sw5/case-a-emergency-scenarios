import { Router } from "express";
import {
  getCurrentScenarioState,
  getScenario,
  getScenarios,
} from "../controllers/scenario-controller.js";

import { requireAuth } from "../middleware/require-auth.js";

export const scenarioRouter = Router();

scenarioRouter.get("/api/v1/scenarios", requireAuth, getScenarios);
scenarioRouter.get("/api/v1/scenarios/:scenarioId", requireAuth, getScenario);
scenarioRouter.get(
  "/api/v1/scenario-state",
  requireAuth,
  getCurrentScenarioState,
);
