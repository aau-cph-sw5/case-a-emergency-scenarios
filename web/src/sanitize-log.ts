const LOG_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

export function sanitizeLogValue(value: unknown): string {
  const message =
    value instanceof Error
      ? (value.stack ?? `${value.name}: ${value.message}`)
      : typeof value === "string"
        ? value
        : "Unknown error";

  return message.replace(LOG_CONTROL_CHARACTERS, " ");
}
