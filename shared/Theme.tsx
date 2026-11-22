// Single source of truth for shared styling.
import { Platform } from "react-native";
import type { ScenarioState } from "./types/v1/scenario-state";

// Raw colours. Nothing outside this object holds a hex value.
export const palette = {
  metroBlack: "#1E1E1E",
  metroDeepRed: "#940024",
  metroLineOne: "#008D40",
  metroLineTwo: "#FFC600",
  metroLineThree: "#FF080B",
  metroLineFour: "#019CD3",
  metroSummerRed: "#E40037",
  metroWhite: "#FFFFFF",
  scenarioPurple: "#6A1B9A",
  scenarioPink: "#EC6BB5",
  scenarioLime: "#A5C42F",
  scenarioTurquoise: "#00BDB5",
  scenarioOrange: "#D65A00",
  scenarioLavender: "#C39BEF",
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
  darkRed: "#7F1916",
  lightGrey: "#d9dde0",
  networkGrey: "#B0B0B0",
  // Operator web view (#357). Grey text and outlines that pass WCAG on white:
  // mutedGrey 5.5:1 for small text, optionGrey only for decorative card edges.
  mutedGrey: "#686868",
  optionGrey: "#e0e0e0",
  wellGrey: "#f4f4f4",
  // Darker shade of M4 blue for focus rings: 5.0:1 on white, where M4 blue
  // itself (2.9:1) fails the 3:1 that WCAG 2.4.13 asks of a focus indicator.
  focusTeal: "#00758C",

  // The steward app's look from the approved prototype (#375). Its status
  // colours are the metro colours above; these are the greys around them.
  // Only the steward app uses these; the web keeps the colours above.
  stewardLabelGrey: "#C9CCD0",
  stewardInputBorder: "#9AA0A6",
  stewardLine: "#D9DCDF",
  stewardStrip: "#F6F7F8",
  stewardMuted: "#5B6168",
  stewardLocked: "#C9CDD2",
  stewardLockedText: "#3D4249",
  // Labels on the yellow and the green status card, and the connection dot,
  // bright enough to show on every card colour.
  stewardLabelOnYellow: "rgba(30, 30, 30, 0.62)",
  stewardLabelOnGreen: "rgba(255, 255, 255, 0.78)",
  stewardOnline: "#3FBF7F",
  // Shades for the staffing bar on a card of the same colour (#376): a pale
  // yellow on the yellow card and a light green on the green card (3.1:1), so
  // the segment still shows. The pale yellow was chosen by eye on the phone
  // over a darker one, which read as brown; it stands out less from the card
  // (1.3:1) than the 3:1 that WCAG 1.4.11 asks of graphics.
  stewardYellowOnYellow: "#FFEAA6",
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
  statusRedBorder: palette.darkRed,
  statusYellowText: palette.darkYellow,
  subtleBorder: palette.lightGrey, // card outlines that should not compete with the status colour
  requiredStation: palette.signalOrange, // a station the scenario needs staff at; no line on the map uses it
  blockedTrack: palette.metroDeepRed, // darker than M3's red, and drawn dashed to tell them apart
};

export const messageSymbols = { pin: "📌" } as const;

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
    fontFamily: Platform.select({ web: '"Metro", Arial, sans-serif' }),
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

// The operator web view styles itself in web/src/components/OperatorSections.css.
// These custom properties hand it the theme, so the colours it shares with the
// rest of the app are defined once, here. OperatorDashboard sets them on its
// root element.
export const operatorCssVars = {
  "--operator-red": palette.metroLineThree,
  "--operator-yellow": palette.metroLineTwo,
  "--operator-green": palette.metroLineOne,
  "--operator-blue": palette.metroLineFour,
  "--operator-ink": palette.metroBlack,
  "--operator-muted": palette.mutedGrey,
  "--operator-option-border": palette.optionGrey,
  "--operator-well": palette.wellGrey,
  "--operator-focus": palette.focusTeal,
  // Two corner sizes only (design guide: outer = inner x 3): 4px for things you
  // press or type in, 12px for things that hold content. Circles use 50%.
  "--operator-radius-control": "4px",
  "--operator-radius-card": "12px",
  // Pressed toggles are a light tint of ink, not yellow: yellow read as an
  // alarm next to the map's warning colours (design review, #357).
  "--operator-pressed": `${palette.metroBlack}1a`,
  "--operator-pressed-border": `${palette.metroBlack}59`,
} as const;
// The steward app's colours and sizes (#375). The status colours match the
// slide that leads to the status: yellow on the way, green arrived, red
// checked out. They are the exact line colours from Metro's brand guide (M2
// yellow, M1 green, M3 red), and the neutral colour is Metro Black. M4 blue is
// not used: as a neutral colour it would read as the M4 line. A station row
// uses two colours only: red when nobody is assigned and black otherwise, with
// a check mark when it is fully staffed. Red text is Metro Deep Red, the
// darker brand red, which stays legible on white at small sizes.
export const steward = {
  yellow: palette.metroLineTwo,
  green: palette.metroLineOne,
  red: palette.metroLineThree,
  black: palette.metroBlack,
  line: palette.stewardLine,
  strip: palette.stewardStrip,
  muted: palette.stewardMuted,
  nobody: palette.metroDeepRed,
  // A slide that cannot be used right now, for example without a connection.
  locked: palette.stewardLocked,
  lockedText: palette.stewardLockedText,
  online: palette.stewardOnline,
  yellowOnYellow: palette.stewardYellowOnYellow,
  // The same green as the connection dot beside the scenario name.
  greenOnGreen: palette.stewardOnline,
  // The station's chat (MET-A-029, #335). Metro Deep Red is the control
  // room's voice: its messages are filled with it and its name is written in
  // it (9.2:1 against white). The station's own messages stay black, and the
  // tab stays black, so no red reads as an alarm on the status card.
  chat: {
    controlRoom: palette.metroDeepRed,
    onControlRoom: palette.metroWhite,
    // A colleague at the same station writes as the station too; their
    // messages are light grey, so the steward's own stay the black ones.
    colleague: palette.stewardLine,
    onColleague: palette.metroBlack,
    // The outline of the box the steward writes in, and its selection.
    inputBorder: palette.stewardInputBorder,
  },
  // The status card takes the colour of the status (#376): black without a
  // station, yellow on the way, green once arrived. text is the station name,
  // label the small labels and the line under the name.
  card: {
    none: {
      background: palette.metroBlack,
      text: palette.metroWhite,
      label: palette.stewardLabelGrey,
    },
    onTheWay: {
      background: palette.metroLineTwo,
      text: palette.metroBlack,
      label: palette.stewardLabelOnYellow,
    },
    arrived: {
      background: palette.metroLineOne,
      text: palette.metroWhite,
      label: palette.stewardLabelOnGreen,
    },
    // The scenario was stood down: the card turns red and shows only the
    // message (NoticeCard).
    stoodDown: {
      background: palette.metroDeepRed,
      text: palette.metroWhite,
      label: palette.metroWhite,
    },
  },
  ownRowHeight: 64,
  slideHeight: 56,
};

// How things move in the steward app (#375). Every block that opens or closes
// uses the same duration and an ease-in-out curve (animateNextLayout).
// Replacing one thing by another (Swap) is a shared-axis change, or the status
// card turned over for a new status.
export const motion = {
  layoutMs: 380,
  // A row that changes place in a column (a station going to the top of the
  // list) moves slowly enough to follow with the eye.
  rowMoveMs: 700,
  // The sheen over a text: one cycle, and the share of it spent sweeping (the
  // rest is rest, so the eye is not tired by a loop that never stops).
  shineMs: 3000,
  shineSweepShare: 0.6,
  // The turn of the status card, 180 degrees like a playing card turned
  // over. A turn is a bigger change than a fade, so it is a little slower,
  // eased in and out: it starts softly, turns through the edge and lands
  // softly.
  flipMs: 400,
  // Shared axis: how one thing replaces another in the same place (the slide
  // taking its next action, a control replacing another). The old moves a
  // little up while fading out, then the new moves up into place from a
  // little below while fading in. Material moves 30 dp; the slide is only 56
  // high, so this moves less.
  axisDistance: 16,
  axisOutMs: 100,
  axisInMs: 220,
};

// A required station on the map by its live coverage (MET-A-011, #310): the
// same green, yellow and red as the coverage cards. text is the colour of the
// staffing number drawn on it.
export const coverageColors = {
  covered: { fill: colors.statusGreen, text: colors.textInverse },
  partial: { fill: colors.statusYellow, text: colors.text },
  gap: { fill: colors.statusRed, text: colors.textInverse },
} as const;
