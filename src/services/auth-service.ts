import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { authSessionRepository } from "../repositories/auth-session-repository.js";
import { userRepository } from "../repositories/user-repository.js";

export type Role = "STEWARD" | "OPERATOR";

const JWT_SECRET =
  process.env.JWT_SECRET || "local-dev-secret-not-for-production";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "JWT_SECRET must be set via an environment variable outside local development.",
  );
}

// Token expiry time
const TOKEN_TTL = "30d";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isRole(role: unknown): role is Role {
  return role === "STEWARD" || role === "OPERATOR";
}

export async function login(
  username: string,
  password: string,
): Promise<{ token: string; role: Role } | null> {
  const user = await userRepository.getUserByUsername(username);

  if (!user || !isRole(user.role)) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  const token = jwt.sign(
    { userId: user.id, role: user.role, jti },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );

  await authSessionRepository.startSession(user.id, jti, expiresAt);

  return { token, role: user.role };
}

export type AuthUser = {
  userId: number;
  role: Role;
  jti: string;
};

export async function verifyToken(token: string): Promise<AuthUser | null> {
  let payload: jwt.JwtPayload | string;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }

  if (
    typeof payload === "string" ||
    typeof payload.userId !== "number" ||
    typeof payload.jti !== "string" ||
    !isRole(payload.role)
  ) {
    return null;
  }

  const session = await authSessionRepository.findActiveSession(
    payload.userId,
    payload.jti,
  );

  if (!session) return null;

  return {
    userId: payload.userId,
    role: payload.role,
    jti: payload.jti,
  };
}

export async function logout(user: AuthUser): Promise<void> {
  await authSessionRepository.revokeSession(user.userId, user.jti);
}
