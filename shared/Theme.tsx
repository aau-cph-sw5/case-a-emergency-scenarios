// Single source of truth for shared styling.
import { Platform } from "react-native";

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

  // Not in the metro set, kept so nothing changes visually. Swap for metro colours if you like.
  pageGrey: "#ecf0f1",
  actionBlue: "#2563eb",
  linePurple: "#9b59b6",
  lineOrange: "#e67e22",
  darkYellow: "#8A6A00", // yellow dark enough to read as text on white
  lightGrey: "#d9dde0",
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
};

export const lineColors = [
  palette.metroLineOne,
  palette.metroLineTwo,
  palette.metroLineThree,
  palette.metroLineFour,
  palette.linePurple,
  palette.lineOrange,
];

// Controls the corner rounding of every element (the app currently has none).
export const radius = 0;
// Cards in the operator view follow the wireframe's rounded corners, without
// rounding every other element.
export const cardRadius = 6;

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
