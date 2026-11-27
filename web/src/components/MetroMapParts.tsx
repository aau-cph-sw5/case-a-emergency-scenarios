import { use, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Pressable, Text, View } from "react-native";
import {
  colors as theme,
  legendSwatch,
  palette,
  radius,
  spacing,
  text,
  zoomControlsInset,
} from "../../../shared/Theme";
import type { ActiveDeployments } from "../../../shared/components/stationState";
import type { Scenario } from "../../../shared/types/v1/scenario";
import { ColourSlotContext } from "./colour-slot";
import type { ColourBy } from "./metroMapModel";

// Design rationale: the small pieces around the map, split out of MetroMap so
// each one reads on its own. Colours and spacing come from shared/Theme.

const COLOUR_MODES: { id: ColourBy; label: string }[] = [
  { id: "line", label: "Metrolinje" },
  { id: "did", label: "Destination ID" },
];

export function ScenarioBanner({
  scenario,
  deployments,
  canZoom,
}: {
  scenario: Scenario;
  deployments: ActiveDeployments | null;
  canZoom: boolean;
}) {
  return (
    <Text
      style={[
        text.small,
        {
          backgroundColor: theme.background,
          padding: spacing.medium,
          paddingRight: canZoom ? zoomControlsInset : spacing.medium,
        },
      ]}
    >
      {scenario.name} · Tal på stationerne viser krævede stewards
      {deployments !== null
        ? " · Grøn: bemandet, gul: delvist, rød: mangler"
        : ""}
    </Text>
  );
}

export function ZoomToggle({
  zoomedIn,
  onToggle,
}: {
  zoomedIn: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      testID="map-zoom-toggle"
      accessibilityRole="button"
      accessibilityLabel={zoomedIn ? "Zoom ud" : "Zoom ind"}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        backgroundColor: palette.metroLineFour,
        borderColor: theme.text,
        borderWidth: 1,
        borderRadius: Math.max(radius, 8),
        padding: 8,
        margin: 4,
      }}
      onPress={onToggle}
    >
      <Text
        style={[text.body, { color: theme.textInverse, fontWeight: "700" }]}
      >
        {zoomedIn ? "Zoom ud" : "Zoom ind"}
      </Text>
    </Pressable>
  );
}

export function MapAlerts({
  incomplete,
  missingRoutes,
}: {
  incomplete: boolean;
  missingRoutes: boolean;
}) {
  return (
    <>
      {incomplete && (
        <Text role="alert" style={text.small}>
          Metronetværket er ufuldstændigt.
        </Text>
      )}
      {missingRoutes && (
        <Text role="alert" style={text.small}>
          En eller flere ruter kan ikke vises på kortet.
        </Text>
      )}
    </>
  );
}

// Same segmented switch as M1 / M2 in the header and the mode tabs in the
// scenario picker (.operator-line-switcher), so the three switches look and
// behave alike: the pressed option is the white one.
function ColourSwitch({
  colourBy,
  onChange,
}: {
  colourBy: ColourBy;
  onChange: (mode: ColourBy) => void;
}) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.s8 }}
    >
      <Text style={text.small}>Farver efter:</Text>
      <div
        className="operator-line-switcher"
        role="group"
        aria-label="Farver efter"
      >
        {COLOUR_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={colourBy === id}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </View>
  );
}

function LegendEntry({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.s6 }}
    >
      <View style={{ ...legendSwatch, backgroundColor: color }} />
      <Text style={text.small}>{label}</Text>
    </View>
  );
}

// The colour switch is drawn in the legend row above the map when the
// dashboard offers that slot.
function inSlot(node: ReactNode, slot: HTMLElement | null) {
  return slot ? createPortal(node, slot) : node;
}

export function Legend({
  colourBy,
  onColourBy,
  entries,
}: {
  colourBy: ColourBy;
  onColourBy: (mode: ColourBy) => void;
  entries: { label: string; color: string }[];
}) {
  const colourSlot = use(ColourSlotContext);
  const title = colourBy === "did" ? "Destination IDs" : "Metrolinjer";
  return (
    <View
      accessibilityLabel={title}
      style={{
        marginLeft: spacing.s8,
        flexDirection: "column",
        gap: spacing.s6,
      }}
    >
      {inSlot(
        <ColourSwitch colourBy={colourBy} onChange={onColourBy} />,
        colourSlot,
      )}
      <Text style={text.small}>{title}:</Text>
      <View style={{ flexDirection: "row", gap: spacing.s8, flexWrap: "wrap" }}>
        {entries.map((entry) => (
          <LegendEntry key={entry.label} {...entry} />
        ))}
      </View>
    </View>
  );
}
