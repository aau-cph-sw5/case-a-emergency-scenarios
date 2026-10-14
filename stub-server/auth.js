import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ERROR_CODES, errorBody } from "./error-codes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const accountsPath = path.join(__dirname, "../fixtures/v1/test-accounts.json");

// Local-dev only. Revisit as a real secret before anything resembling production exists.
const JWT_SECRET =
  process.env.JWT_SECRET || "local-dev-secret-not-for-production";

// Fail fast rather than silently signing tokens with the dev fallback
// anywhere that isn't a developer's machine.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "JWT_SECRET must be set via an environment variable outside local development.",
  );
}

// PLACEHOLDER — owned by #89 (AC1: "session lifetime, refresh and expiry
// behaviour are specified and documented before implementation"). 1h is a
// guess, not a decision. Change it here once #89 settles the real value.
const TOKEN_TTL = "1h";

function loadAccounts() {
  return JSON.parse(fs.readFileSync(accountsPath, "utf8"));
}

export function login(username, password) {
  const account = loadAccounts().find((a) => a.username === username);
  if (!account) return null;
  if (!bcrypt.compareSync(password, account.passwordHash)) return null;

  const token = jwt.sign(
    { userId: account.userId, role: account.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );

  return { token, role: account.role };
}

// Role comes only from the verified JWT payload — never from a header, query
// param or body the client controls. Tampering with the payload invalidates
// the signature and jwt.verify throws.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json(errorBody(ERROR_CODES.AUTH_TOKEN_INVALID, "Missing bearer token"));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res
      .status(401)
      .json(
        errorBody(ERROR_CODES.AUTH_TOKEN_INVALID, "Invalid or expired token"),
      );
  }
}
