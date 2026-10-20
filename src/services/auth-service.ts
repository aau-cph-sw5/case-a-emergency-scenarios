import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { isRole, type Role } from "../../shared/auth/roles.js";
import { authSessionRepository } from "../repositories/auth-session-repository.js";
import { userRepository } from "../repositories/user-repository.js";

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET must be set before the server starts.");
  }

  return secret;
}

const JWT_SECRET = requireJwtSecret();

// Token expiry time
const TOKEN_TTL = "30d";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function login(
  username: string,
  password: string,
  expectedRole: Role,
): Promise<{ token: string; role: Role } | null> {
  const user = await userRepository.getUserByUsername(username);

  if (!user || !isRole(user.role)) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;
  if (user.role !== expectedRole) return null;

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

function isAuthPayload(payload: unknown): payload is AuthUser {
  if (typeof payload !== "object" || payload === null) return false;

  const { userId, role, jti } = payload as Record<string, unknown>;

  return (
    typeof userId === "number" &&
    typeof jti === "string" &&
    jti !== "" &&
    isRole(role)
  );
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  let payload: jwt.JwtPayload | string;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }

  if (!isAuthPayload(payload)) {
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
