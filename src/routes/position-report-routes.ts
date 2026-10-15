import { Router } from "express";
import { postPositionReport } from "../controllers/position-report-controller.js";
import { validateBody } from "../middleware/validate-body.js";

export const positionReportRouter = Router();

positionReportRouter.post(
  "/api/v1/position-reports",
  validateBody("position-report.schema.json"),
  postPositionReport,
);
