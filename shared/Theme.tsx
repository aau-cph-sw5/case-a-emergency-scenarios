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
  // The control-room banner's grey border and hover background.
  barBorder: "#454545",
  barHover: "#2B2B2B",

  // Not in the metro set, kept so nothing changes visually. Swap for metro colours if you like.
  pageGrey: "#ecf0f1",
  actionBlue: "#2563eb",
  linePurple: "#9b59b6",
  lineOrange: "#e67e22",
};

export const colors = {
  background: palette.metroWhite, // the one background colour used by every component surface
  page: palette.pageGrey, // slightly grey page background behind the components
  text: palette.metroBlack,
  textInverse: palette.metroWhite,
  border: palette.metroBlack,
  active: palette.metroBlack, // selected / hovered state (inverted)
  action: palette.actionBlue, // confirm button
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

export const text = {
  body: {},
  title: { fontSize: 18, fontWeight: "600" as const },
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

export const page = {
  backgroundColor: colors.page,
  flex: 1,
};
