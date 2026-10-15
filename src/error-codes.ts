// This product's error codes for API responses.
// See the error codes below in the semester-docs:
// https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/06-error-codes.md


export const ERROR_CODES = {
  AUTH_TOKEN_INVALID: "E0001", 
  INVALID_CREDENTIALS: "E0102", 
  MISSING_PARAMETER: "E0006", 
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function errorBody(code: ErrorCode, message: string) {
  return { error: { code, message } };
}
