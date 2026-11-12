import type { Role } from "./roles.js";

export type Client = "web" | "mobile";

const CLIENT_ROLES: Record<Client, readonly Role[]> = {
  web: ["OPERATOR", "ANALYST"],
  mobile: ["STEWARD"],
};

export function isRoleAllowedForClient(client: Client, role: Role): boolean {
  return CLIENT_ROLES[client].includes(role);
}
