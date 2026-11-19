import { Router } from "express";
import { createScenarioHandler } from "../controllers/create-scenario-controller.js";
import {
  activate,
  getActivations,
  getCurrentScenarioState,
  getScenario,
  getScenarios,
  standDown,
} from "../controllers/scenario-controller.js";

import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import {
  validateBody,
  validateOptionalBody,
} from "../middleware/validate-body.js";

export const scenarioRouter = Router();

scenarioRouter.get("/api/v1/scenarios", requireAuth, getScenarios);
scenarioRouter.post(
  "/api/v1/scenarios",
  requireAuth,
  requireRole("ADMIN"),
  validateBody("create-scenario-request.schema.json"),
  createScenarioHandler,
);
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
