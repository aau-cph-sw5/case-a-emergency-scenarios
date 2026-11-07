// No react-native imports here, so the unit tests can import this file.
// Why the steward app shows the saved copy instead of live data (MET-A-005).
import { FormatError, HttpError } from "../api/http";

export type CopyReason = "offline" | "server";

// The banner over the copy.
export const COPY_LABELS: Record<CopyReason, string> = {
  offline: "Offline",
  server: "Serverfejl",
};

// Shown when there is no saved copy to fall back on.
export const NO_COPY_MESSAGES: Record<CopyReason, string> = {
  offline: "Ingen forbindelse til serveren, og der er ingen gemt kopi.",
  server: "Serveren svarede med en fejl, og der er ingen gemt kopi.",
};

// Only errors that prove the server answered count as a server error.
// Everything else (no network, the 10 s timeout) counts as offline; React
// Native's fetch and timeout errors are not reliably Error instances.
export function reasonFor(error: unknown): CopyReason {
  return error instanceof HttpError || error instanceof FormatError
    ? "server"
    : "offline";
}
