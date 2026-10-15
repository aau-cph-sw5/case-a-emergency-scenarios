import { Router } from "express";
import { getMetroLine } from "../controllers/metro-line-controller.js";

export const metroLineRouter = Router();

metroLineRouter.get("/api/v1/metro-lines/:lineId", getMetroLine);
