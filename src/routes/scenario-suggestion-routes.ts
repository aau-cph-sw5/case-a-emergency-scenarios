import { Router } from "express";
import { postScenarioSuggestions } from "../controllers/scenario-suggestion-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { validateBody } from "../middleware/validate-body.js";

export const scenarioSuggestionRouter = Router();

// The request schema is a definition inside the response schema
// (contracts/v1/scenario-suggestion.schema.json).
scenarioSuggestionRouter.post(
  "/api/v1/scenario-suggestions",
  requireAuth,
  requireRole("OPERATOR"),
  validateBody(
    "scenario-suggestion.schema.json#/definitions/ScenarioSuggestionRequest",
  ),
  postScenarioSuggestions,
);
