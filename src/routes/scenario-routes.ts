import { Router } from "express";
import {
  activate,
  getActivations,
  getActivationEvents,
  getCurrentScenarioState,
  getScenario,
  getScenarios,
  standDown,
} from "../controllers/scenario-controller.js";

import { requireAuth } from "../middleware/require-auth.js";
import { validateOptionalBody } from "../middleware/validate-body.js";

export const scenarioRouter = Router();

scenarioRouter.get("/api/v1/scenarios", requireAuth, getScenarios);
scenarioRouter.get("/api/v1/scenarios/:scenarioId", requireAuth, getScenario);
scenarioRouter.get(
  "/api/v1/scenario-state",
  requireAuth,
  getCurrentScenarioState,
);
scenarioRouter.get("/api/v1/activations", requireAuth, getActivations);
scenarioRouter.post(
  "/api/v1/scenarios/:scenarioId/activate",
  requireAuth,
  validateOptionalBody("activate-request.schema.json"),
  activate,
);
scenarioRouter.post(
  "/api/v1/activations/:activationId/stand-down",
  requireAuth,
  standDown,
);
scenarioRouter.get(
  "/api/v1/activations/:activationId/events",
  requireAuth,
  getActivationEvents,
);