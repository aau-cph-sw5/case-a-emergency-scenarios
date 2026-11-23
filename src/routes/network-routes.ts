import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getNetwork } from "../repositories/network-repository.js";

export const networkRouter = Router();

networkRouter.get(
  "/api/v1/network",
  requireAuth,
  async (_request, response) => {
    response.json(await getNetwork());
  },
);
