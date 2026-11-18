import { Router } from "express";
import {
  getStationThread,
  getStationThreads,
  postStationMessage,
} from "../controllers/station-message-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate-body.js";

export const stationMessageRouter = Router();

// Each endpoint requires a valid token:
// GET /api/v1/station-threads lists threads.
// GET /api/v1/station-threads/:station reads one station's thread.
// POST /api/v1/station-threads/:station/messages sends a message.
stationMessageRouter.get(
  "/api/v1/station-threads",
  requireAuth,
  getStationThreads,
);

stationMessageRouter.get(
  "/api/v1/station-threads/:station",
  requireAuth,
  getStationThread,
);

stationMessageRouter.post(
  "/api/v1/station-threads/:station/messages",
  requireAuth,
  // Reject invalid message bodies before the controller saves anything.
  validateBody("station-message-request.schema.json"),
  postStationMessage,
);
