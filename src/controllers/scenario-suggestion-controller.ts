import type { Request, Response } from "express";
import type { AuthUser } from "../services/auth-service.js";
import { suggestForOperator } from "../services/scenario-suggestion-service.js";

// POST /api/v1/scenario-suggestions (MET-A-019, #371). The route has already
// checked the token, the OPERATOR role and the body against the contract. The
// line group comes from the signed-in user, so an operator only gets
// suggestions from their own scenarios. It only suggests, never activates.
export async function postScenarioSuggestions(
  request: Request<unknown, unknown, { description: string }>,
  response: Response,
) {
  const { lineGroup } = response.locals.user as AuthUser;
  response.json(await suggestForOperator(lineGroup, request.body.description));
}
