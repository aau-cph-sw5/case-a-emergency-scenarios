import express from "express";
import { authRouter } from "./routes/auth-routes.js";
import { healthRouter } from "./routes/health-routes.js";
import { metroLineRouter } from "./routes/metro-line-routes.js";
import { positionReportRouter } from "./routes/position-report-routes.js";
import { scenarioRouter } from "./routes/scenario-routes.js";

export const app = express();

app.use(express.json());
app.use(healthRouter);
app.use(authRouter);
app.use(scenarioRouter);
app.use(metroLineRouter);
app.use(positionReportRouter);
