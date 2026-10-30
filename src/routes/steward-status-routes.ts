import { Router } from "express";
import {
  getAllStatuses,
  getOwnStatus,
  putOwnStatus,
} from "../controllers/steward-status-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate-body.js";

export const stewardStatusRouter = Router();

stewardStatusRouter.get("/api/v1/steward-status", requireAuth, getOwnStatus);
stewardStatusRouter.put(
  "/api/v1/steward-status",
  requireAuth,
  validateBody("steward-status-request.schema.json"),
  putOwnStatus,
);
stewardStatusRouter.get(
  "/api/v1/steward-statuses",
  requireAuth,
  getAllStatuses,
);
