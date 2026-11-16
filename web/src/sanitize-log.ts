const LOG_CONTROL_CHARACTERS = /[\p{Cc}\u2028\u2029]/gu;

export function sanitizeLogValue(value: unknown): string {
  const message =
    value instanceof Error
      ? (value.stack ?? `${value.name}: ${value.message}`)
      : typeof value === "string"
        ? value
        : "Unknown error";

  return message.replace(LOG_CONTROL_CHARACTERS, " ");
}
