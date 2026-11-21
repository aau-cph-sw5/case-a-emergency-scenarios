import { Router } from "express";
import {
  getUsers,
  editUser,
  postUser,
} from "../controllers/user-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { validateBody } from "../middleware/validate-body.js";

export const userRouter = Router();

userRouter.get("/api/v1/users", requireAuth, requireRole("ADMIN"), getUsers);
userRouter.post(
  "/api/v1/users",
  requireAuth,
  requireRole("ADMIN"),
  validateBody("user-create.schema.json"),
  postUser,
);
userRouter.patch(
  "/api/v1/users/:userId",
  requireAuth,
  requireRole("ADMIN"),
  validateBody("user-update.schema.json"),
  editUser,
);
