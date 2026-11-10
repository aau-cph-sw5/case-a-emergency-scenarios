export const LINE_GROUPS = ["M1_M2", "M3_M4"] as const;

export type LineGroup = (typeof LINE_GROUPS)[number];

export function isLineGroup(value: unknown): value is LineGroup {
  return typeof value === "string" && LINE_GROUPS.includes(value as LineGroup);
}
