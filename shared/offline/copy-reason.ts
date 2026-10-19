// No react-native imports here, so the unit tests can import this file.
// Why the steward app shows the saved copy instead of live data (MET-A-005).
import { FormatError, HttpError } from "../api/http";

export type CopyReason = "offline" | "expired" | "server";

// The banner over the copy.
export const COPY_LABELS: Record<CopyReason, string> = {
  offline: "Offline",
  expired: "Sessionen er udløbet",
  server: "Serverfejl",
};

// Shown when there is no saved copy to fall back on.
export const COPY_MESSAGES: Record<CopyReason, string> = {
  offline: "Ingen forbindelse til serveren.",
  expired: "Sessionen er udløbet. Log ud og ind igen.",
  server: "Serveren svarede med en fejl.",
};

// Only errors that prove the server answered count as a server error: a 401
// means the token expired, any other status or a malformed answer is a server
// error. Everything else (no network, the 10 s timeout) counts as offline;
// React Native's fetch and timeout errors are not reliably Error instances.
export function reasonFor(error: unknown): CopyReason {
  if (error instanceof HttpError) {
    return error.status === 401 ? "expired" : "server";
  }
  if (error instanceof FormatError) return "server";
  return "offline";
}
