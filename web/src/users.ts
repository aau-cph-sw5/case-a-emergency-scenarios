import type { Role } from "../../shared/auth/roles";
import { ERROR_CODES } from "../../shared/error-codes";
import type { User } from "../../shared/types/v1/user";
import type { UserCreate } from "../../shared/types/v1/user-create";
import type { UserUpdate } from "../../shared/types/v1/user-update";
import { ApiError, getJson, sendJson, userMessage } from "./get-json";

export const ROLE_LABELS: Record<Role, string> = {
  STEWARD: "Steward",
  OPERATOR: "Operatør",
  ADMIN: "Administrator",
};

function isUser(data: unknown): data is User {
  const user = data as Partial<User> | null;
  return (
    typeof user?.userId === "number" &&
    typeof user.username === "string" &&
    typeof user.role === "string" &&
    typeof user.lineGroup === "string"
  );
}

function isUserList(data: unknown): data is User[] {
  return Array.isArray(data) && data.every(isUser);
}

export function fetchUsers(token: string, signal: AbortSignal) {
  return getJson("/api/v1/users", token, isUserList, signal);
}

export function createUser(token: string, body: UserCreate) {
  return sendJson("POST", "/api/v1/users", token, isUser, body);
}

export function updateUser(token: string, userId: number, body: UserUpdate) {
  return sendJson("PATCH", `/api/v1/users/${userId}`, token, isUser, body);
}

// The texts for this page. E0007 means a taken username when creating and the
// admin's own role when editing; the form only allows the first.
export function userAdminMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === ERROR_CODES.CONFLICT) {
      return "Brugernavnet findes allerede.";
    }
    if (error.status === 404) return "Brugeren findes ikke længere.";
    if (error.status === 400) {
      return "Udfyld alle felter. Adgangskoden skal være mindst 8 tegn.";
    }
  }
  return userMessage(error);
}
