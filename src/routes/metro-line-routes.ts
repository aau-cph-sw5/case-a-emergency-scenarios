import { Router } from "express";
import { getMetroLine } from "../controllers/metro-line-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

export const metroLineRouter = Router();

metroLineRouter.get("/api/v1/metro-lines/:lineId", requireAuth, getMetroLine);
