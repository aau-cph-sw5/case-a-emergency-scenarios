// Single source of truth for shared styling.
import { Platform } from "react-native";
import type { ScenarioState } from "./types/v1/scenario-state";

// Raw colours. Nothing outside this object holds a hex value.
export const palette = {
  metroBlack: "#1E1E1E",
  metroDeepRed: "#940024",
  metroLineOne: "#007D55",
  metroLineTwo: "#FFC82D",
  metroLineThree: "#E6140F",
  metroLineFour: "#00A0BE",
  metroSummerRed: "#E40037",
  metroWhite: "#FFFFFF",
  DIDLineOne: "#1F4E79",
  DIDLineTwo: "#A61E75",
  DIDLineThree: "#6B3FA0",
  DIDLineFour: "#B45309",
  DIDLineFive: "#00796B",
  DIDLineSix: "#455A64",
  DIDLineSeven: "#667C22",
  DIDLineEight: "#795548",

  // Not in the metro set, kept so nothing changes visually. Swap for metro colours if you like.
  pageGrey: "#ecf0f1",
  actionBlue: "#2563eb",
  linePurple: "#9b59b6",
  lineOrange: "#e67e22",
  signalOrange: "#FF6A00",
  darkYellow: "#8A6A00", // yellow dark enough to read as text on white
  lightGrey: "#d9dde0",
  networkGrey: "#B0B0B0",
};

export const colors = {
  background: palette.metroWhite, // the one background colour used by every component surface
  page: palette.pageGrey, // slightly grey page background behind the components
  text: palette.metroBlack,
  textInverse: palette.metroWhite,
  border: palette.metroBlack,
  active: palette.metroBlack, // selected / hovered state (inverted)
  action: palette.actionBlue, // confirm button
  statusGreen: palette.metroLineOne,
  statusYellow: palette.metroLineTwo,
  statusRed: palette.metroLineThree,
  statusYellowText: palette.darkYellow,
  subtleBorder: palette.lightGrey, // card outlines that should not compete with the status colour
  requiredStation: palette.signalOrange, // a station the scenario needs staff at; no line on the map uses it
  blockedTrack: palette.metroDeepRed, // darker than M3's red, and drawn dashed to tell them apart
};

// How a steward's status looks, in the control room and the steward app. The
// word carries the meaning; the symbol and colour only help. Yellow text
// uses the darker shade, which reads on white. A status missing
// here (or no status) is shown as having none.
export const stewardStatus: Partial<
  Record<
    ScenarioState["deployments"][number]["status"],
    { label: string; symbol?: string; color: string }
  >
> = {
  PENDING: { label: "På vej", color: colors.statusYellowText },
  MANNED: { label: "Ankommet", symbol: "✓", color: colors.statusGreen },
  TASK_DONE: {
    label: "Opgave udført",
    symbol: "✓✓",
    color: colors.statusGreen,
  },
  // The steward has left the station after arriving (contract 7.1.0, #305).
  CHECKED_OUT: { label: "Tjekket ud", color: colors.text },
};

export const lineColors = [
  palette.metroLineOne,
  palette.metroLineTwo,
  palette.metroLineThree,
  palette.metroLineFour,
  palette.linePurple,
  palette.lineOrange,
];

export const DIDLineColors = [
  palette.DIDLineOne,
  palette.DIDLineTwo,
  palette.DIDLineThree,
  palette.DIDLineFour,
  palette.DIDLineFive,
  palette.DIDLineSix,
  palette.DIDLineSeven,
  palette.DIDLineEight,
];

// Controls the corner rounding of every element (the app currently has none).
export const radius = 0;
// Cards in the operator view follow the wireframe's rounded corners, without
// rounding every other element.
export const cardRadius = 6;
// The steward app's status and task panels follow the design group's sketch,
// which is rounder than the operator cards.
export const panelRadius = 12;

export const text = {
  body: {},
  title: { fontSize: 18, fontWeight: "600" as const },
  small: { fontSize: 12, color: colors.text },
  // A CSS font list only works on web; Android and iOS use the system font.
  header: {
    fontFamily: Platform.select({ web: "Arial, sans-serif" }),
    fontSize: 16,
  },
  button: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  mapLabel: { fontSize: "18", fontWeight: "bold" as const }, // SVG <Text> props
  // A small heading above a figure, e.g. "STATIONS COVERED".
  label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1 },
  // The big number in a figure, e.g. the 8 in "8 af 15".
  figure: { fontSize: 28, fontWeight: "700" as const },
};
export const spacing = {
  small: 4,
  medium: 12,
  large: 16,
};

export const surface = {
  backgroundColor: colors.background,
  borderRadius: radius,
};

export const box = {
  borderWidth: 1,
  borderColor: colors.border,
  padding: 6,
  borderRadius: radius,
};

// A card on white with a light outline, for example one station's coverage.
export const card = {
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.subtleBorder,
  borderRadius: cardRadius,
  paddingVertical: 8,
  paddingHorizontal: 10,
};

// A small dark count next to a heading, for example the number of stations.
export const badge = {
  minWidth: 22,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: cardRadius,
  backgroundColor: colors.active,
  color: colors.textInverse,
  fontSize: 12,
  fontWeight: "700" as const,
  textAlign: "center" as const,
};

export const page = {
  backgroundColor: colors.page,
  flex: 1,
};

// A required station on the map by its live coverage (MET-A-011, #310): the
// same green, yellow and red as the coverage cards. text is the colour of the
// staffing number drawn on it.
export const coverageColors = {
  covered: { fill: colors.statusGreen, text: colors.textInverse },
  partial: { fill: colors.statusYellow, text: colors.text },
  gap: { fill: colors.statusRed, text: colors.textInverse },
} as const;
