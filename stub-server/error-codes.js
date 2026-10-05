// This product's error codes for API responses.
// Scheme and shared categories owned by the hub:
// https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/06-error-codes.md
//
// Response shape: { "error": { "code": "E0001", "message": "..." } }
// Codes are never typed as string literals in route handlers — import
// ERROR_CODES instead, so a typo becomes a missing export, not a silent
// mismatch with what a client expects.

export const ERROR_CODES = {
  AUTH_TOKEN_INVALID: "E0001", // Authentication token is missing, invalid or expired
  INVALID_CREDENTIALS: "E0102", // Invalid credentials
  MISSING_PARAMETER: "E0006", // A required parameter is missing
};

export function errorBody(code, message) {
  return { error: { code, message } };
}