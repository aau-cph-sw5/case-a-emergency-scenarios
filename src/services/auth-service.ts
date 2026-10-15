import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { listTestAccounts } from "../repositories/fixture-repository.js";

export type Role = "STEWARD" | "OPERATOR";
export type AuthUser = { userId: string; role: Role };

const JWT_SECRET =
  process.env.JWT_SECRET || "local-dev-secret-not-for-production";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "JWT_SECRET must be set via an environment variable outside local development.",
  );
}

// Token expiry time
const TOKEN_TTL = "1h";

// Verify that the user logging in matches the test accounts that was seeded
export function login(
  username: string,
  password: string,
): { token: string; role: Role } | null {
  const account = listTestAccounts().find((a) => a.username === username);
  if (!account) return null;
  if (!bcrypt.compareSync(password, account.passwordHash)) return null;

  const token = jwt.sign(
    { userId: account.userId, role: account.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );
  return { token, role: account.role };
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Partial<AuthUser>;
    if (typeof payload.userId !== "string") return null;
    if (payload.role !== "STEWARD" && payload.role !== "OPERATOR") return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
