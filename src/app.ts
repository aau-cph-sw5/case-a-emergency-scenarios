import express from "express";
import { healthRouter } from "./routes/health-routes.js";

export const app = express();

app.use(express.json());
app.use(healthRouter);
