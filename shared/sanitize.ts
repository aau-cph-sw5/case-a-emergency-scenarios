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

export function sanitizeApiPathSegment(value: string): string | null {
  if (
    value.length === 0 ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    return null;
  }
  return encodeURIComponent(value);
}

export function sanitizeApiPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];
  // URL parsers normalize encoded dot segments too, so validate decoded segments.
  for (const segment of pathname.split("/")) {
    const decoded = decodeURIComponent(segment);
    if (
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\")
    ) {
      throw new TypeError("API paths must not contain traversal segments");
    }
  }
  return path;
}
