import { Router } from "express";
import {
  getMe,
  postLogin,
  postRenew,
  postLogout,
  putPushToken,
} from "../controllers/auth-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { validateBody } from "../middleware/validate-body.js";

export const authRouter = Router();

authRouter.post(
  "/api/v1/auth/login",
  validateBody("login-request.schema.json"),
  postLogin,
);

authRouter.post("/api/v1/auth/renew", requireAuth, postRenew);

authRouter.get("/api/v1/me", requireAuth, getMe);

authRouter.put(
  "/api/v1/me/push-token",
  requireAuth,
  requireRole("STEWARD"),
  validateBody("push-token-request.schema.json"),
  putPushToken,
);

authRouter.post("/api/v1/auth/logout", requireAuth, postLogout);
