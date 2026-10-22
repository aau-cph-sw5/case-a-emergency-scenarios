import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { isRole, type Role } from "../../shared/auth/roles.js";
import { RENEWAL_WINDOW_MS } from "../../shared/auth/renewal.js";
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

export type AuthSessionResponse = {
  token: string;
  role: Role;
  expiresAt: string;
};

type IssuedSession = {
  response: AuthSessionResponse;
  jti: string;
  expiresAt: Date;
};

function createToken(
  userId: number,
  role: Role,
  jti: string,
  expiresAt?: Date,
): string {
  const payload = expiresAt
    ? { userId, role, jti, exp: Math.floor(expiresAt.getTime() / 1000) }
    : { userId, role, jti };

  return jwt.sign(
    payload,
    JWT_SECRET,
    expiresAt ? undefined : { expiresIn: TOKEN_TTL },
  );
}

function getTokenExpiry(token: string): Date {
  const payload = jwt.decode(token);

  if (
    typeof payload === "string" ||
    payload === null ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Failed to create a JWT with an expiry.");
  }

  return new Date(payload.exp * 1000);
}

async function issueSession(
  userId: number,
  role: Role,
): Promise<AuthSessionResponse> {
  const session = createSession(userId, role);
  await authSessionRepository.startSession(
    userId,
    session.jti,
    session.expiresAt,
  );
  return session.response;
}

function createSession(userId: number, role: Role): IssuedSession {
  const jti = randomUUID();
  const token = createToken(userId, role, jti);
  const expiresAt = getTokenExpiry(token);

  return {
    response: {
      token,
      role,
      expiresAt: expiresAt.toISOString(),
    },
    jti,
    expiresAt,
  };
}

function createRenewedSession(
  userId: number,
  role: Role,
  jti: string,
  expiresAt: Date,
): AuthSessionResponse {
  return {
    token: createToken(userId, role, jti, expiresAt),
    role,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function login(
  username: string,
  password: string,
  expectedRole: Role,
): Promise<AuthSessionResponse | null> {
  const user = await userRepository.getUserByUsername(username);

  if (!user || !isRole(user.role)) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;
  if (user.role !== expectedRole) return null;

  return issueSession(user.id, user.role);
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

export type RenewalResult =
  | { kind: "renewed"; session: AuthSessionResponse }
  | { kind: "not-due" }
  | { kind: "invalid" };

export async function renew(user: AuthUser): Promise<RenewalResult> {
  const session = await authSessionRepository.findActiveSession(
    user.userId,
    user.jti,
  );

  if (!session) return { kind: "invalid" };

  const account = await userRepository.getUserById(user.userId);

  if (!account || !isRole(account.role)) return { kind: "invalid" };

  const remainingMs = session.expiresAt.getTime() - Date.now();

  if (remainingMs > RENEWAL_WINDOW_MS) return { kind: "not-due" };

  const renewedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const extended = await authSessionRepository.extendDueSession(
    user.userId,
    user.jti,
    renewedExpiresAt,
  );

  if (extended) {
    return {
      kind: "renewed",
      session: createRenewedSession(
        user.userId,
        account.role,
        user.jti,
        extended.expiresAt,
      ),
    };
  }

  const currentSession = await authSessionRepository.findActiveSession(
    user.userId,
    user.jti,
  );

  if (!currentSession) return { kind: "invalid" };

  if (currentSession.expiresAt.getTime() - Date.now() > RENEWAL_WINDOW_MS) {
    return {
      kind: "renewed",
      session: createRenewedSession(
        user.userId,
        account.role,
        user.jti,
        currentSession.expiresAt,
      ),
    };
  }

  return { kind: "not-due" };
}

export async function logout(user: AuthUser): Promise<void> {
  await authSessionRepository.revokeSession(user.userId, user.jti);
}
