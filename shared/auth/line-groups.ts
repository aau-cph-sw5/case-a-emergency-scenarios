export const LINE_GROUPS = ["M1_M2", "M3_M4"] as const;

export type LineGroup = (typeof LINE_GROUPS)[number];

// The line group as operators know it, e.g. "M1/M2".
export const LINE_GROUP_LABELS = {
  M1_M2: "M1/M2",
  M3_M4: "M3/M4",
} as const satisfies Record<LineGroup, string>;

export type LineGroupLabel = (typeof LINE_GROUP_LABELS)[LineGroup];

// The other way round: "M3/M4" gives "M3_M4".
export function lineGroupFromLabel(label: LineGroupLabel): LineGroup {
  return (Object.keys(LINE_GROUP_LABELS) as LineGroup[]).find(
    (group) => LINE_GROUP_LABELS[group] === label,
  )!;
}

// The Metro lines belonging to each line group.
export const LINE_GROUP_LINES: Record<LineGroup, readonly string[]> = {
  M1_M2: ["M1", "M2"],
  M3_M4: ["M3", "M4"],
};

export function isLineGroup(value: unknown): value is LineGroup {
  return typeof value === "string" && LINE_GROUPS.includes(value as LineGroup);
}
