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
};

export const colors = {
  background: palette.metroWhite, // the one background colour used by every component surface
  page: palette.metroWhite, // slightly grey page background behind the components
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

export const webBox = {
  ...box,
  borderStyle: "solid" as const,
  boxSizing: "border-box" as const,
};

export const webButton = {
  ...webBox,
  ...text.button,
  padding: 10,
  backgroundColor: colors.action,
  cursor: "pointer" as const,
};

export const webPage = {
  minHeight: "100vh",
  display: "flex" as const,
  flexDirection: "column" as const,
  color: colors.text,
  fontFamily: text.header.fontFamily,
};

export const webScenarioStyles = {
  section: {
    width: "100%",
    boxSizing: "border-box" as const,
    color: colors.text,
    fontFamily: text.header.fontFamily,
  },
  label: {
    ...text.header,
    display: "block",
    color: colors.text,
  },
  input: {
    ...box,
    borderStyle: "solid" as const,
    boxSizing: "border-box" as const,
    display: "block",
    width: "100%",
    marginTop: 4,
    padding: 8,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16,
  },
  message: {
    ...text.header,
    color: colors.text,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  listItem: {
    marginTop: 8,
  },
  button: {
    ...webButton,
    display: "block",
    width: "100%",
  },
  dialog: {
    ...box,
    borderStyle: "solid" as const,
    boxSizing: "border-box" as const,
    width: "min(100% - 32px, 420px)",
  },
};
