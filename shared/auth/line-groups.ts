export const LINE_GROUPS = ["M1_M2", "M3_M4"] as const;

export type LineGroup = (typeof LINE_GROUPS)[number];

// The line group as operators know it, e.g. "M1/M2".
export const LINE_GROUP_LABELS: Record<LineGroup, "M1/M2" | "M3/M4"> = {
  M1_M2: "M1/M2",
  M3_M4: "M3/M4",
};

export function isLineGroup(value: unknown): value is LineGroup {
  return typeof value === "string" && LINE_GROUPS.includes(value as LineGroup);
}
