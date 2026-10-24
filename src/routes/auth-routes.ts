import { Router } from "express";
import {
  getMe,
  postLogin,
  postLogout,
} from "../controllers/auth-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate-body.js";

export const authRouter = Router();

authRouter.post(
  "/api/v1/auth/login",
  validateBody("login-request.schema.json"),
  postLogin,
);
authRouter.get("/api/v1/me", requireAuth, getMe);

authRouter.post("/api/v1/auth/logout", requireAuth, postLogout);
