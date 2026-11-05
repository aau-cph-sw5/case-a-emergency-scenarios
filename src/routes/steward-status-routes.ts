import { Router } from "express";
import { stewardStatusHandler } from "../controllers/steward-status-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate-body.js";

export const stewardStatusRouter = Router();

stewardStatusRouter.post(
  "/api/v1/steward-status/assign",
  requireAuth,
  validateBody("assign-request.schema.json"),
  stewardStatusHandler("assign"),
);
stewardStatusRouter.post(
  "/api/v1/steward-status/check-in",
  requireAuth,
  stewardStatusHandler("check-in"),
);
stewardStatusRouter.post(
  "/api/v1/steward-status/check-out",
  requireAuth,
  stewardStatusHandler("check-out"),
);
