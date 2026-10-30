// Error codes for API responses, imported by the server, the stub and the clients.
// Scheme and shared categories: https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/06-error-codes.md
// Add a code here and to that document in the same pull request.

export const ERROR_CODES = {
  // E00 General
  UNKNOWN: "E0000",
  AUTH_TOKEN_INVALID: "E0001", // Authentication token is missing, invalid or expired
  ROLE_NOT_PERMITTED: "E0002", // The authenticated user's role does not permit this action
  UPSTREAM_UNREACHABLE: "E0003", // A required upstream service could not be reached
  NOT_FOUND: "E0004", // The requested resource does not exist
  INVALID_REQUEST: "E0005", // Syntactically valid but semantically wrong
  MISSING_PARAMETER: "E0006", // A required parameter is missing
  CONFLICT: "E0007", // The request conflicts with the current state of the resource
  SERVICE_UNAVAILABLE: "E0008", // The service is temporarily unavailable
  LIMIT_EXCEEDED: "E0009", // The request would exceed a configured limit
  // E01 Authentication and session
  UNKNOWN_USER: "E0101",
  INVALID_CREDENTIALS: "E0102",
  SESSION_EXPIRED: "E0103",
  ACCOUNT_LOCKED: "E0104",
  // E02 Data and reference material
  REFERENCE_DATA_NOT_LOADED: "E0201",
  IMPORT_VALIDATION_FAILED: "E0202",
  RECORD_VERSION_GONE: "E0203",
  RECORD_SUPERSEDED: "E0204",
  // E10 Case A. Emergency Scenarios
  NO_ACTIVE_SCENARIO: "E1001",
  SCENARIO_ALREADY_ACTIVE_ON_LINE: "E1002",
  SCENARIO_STOOD_DOWN: "E1003",
  STATION_NOT_IN_SCENARIO: "E1004",
  LOCAL_COPY_TOO_STALE: "E1005",
  INVALID_STATUS_TRANSITION: "E1006", // The status change is not permitted from the steward's current status
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// The developer message for each code in use, the "Meaning" column of the
// semester docs. Never shown to a user; the clients choose their own text from
// the code. Add a message here when a code starts being used.
export const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  E0001: "Authentication token is missing, invalid or expired",
  E0002: "The authenticated user's role does not permit this action",
  E0004: "The requested resource does not exist",
  E0006: "A required parameter is missing",
  E0007: "The request conflicts with the current state of the resource",
  E0102: "Invalid credentials",
  E1001: "No scenario is currently active",
  E1004: "The station is not part of the active scenario",
  E1006: "The status change is not permitted from the steward's current status",
};

export function errorBody(
  code: ErrorCode,
  message = ERROR_MESSAGES[code] ?? "Unknown error",
) {
  return { error: { code, message } };
}
