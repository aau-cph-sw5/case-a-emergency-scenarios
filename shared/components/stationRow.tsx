import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { box, text, palette } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import {
  getStationState,
  formatTime,
  type ActiveDeployments,
} from "./stationState";

export type StationRequirement =
  Scenario["versions"][number]["stationRequirements"][number];

// Keyed by the status values in the scenario state
const STATUS = {
  UNMANNED: { color: palette.metroLineThree, symbol: "✕" },
  PENDING: { color: palette.metroLineTwo, symbol: "➜" },
  MANNED: { color: palette.metroLineOne, symbol: "✓" },
  NOT_REQUIRED: { color: palette.metroLineThree, symbol: "–" }, // not used currently, but mentioned in 012
  UNKNOWN: { color: palette.metroLineThree, symbol: "ERR" }, // fallback so bad data never looks covered
} satisfies Record<string, { color: string; symbol: string }>;
// different naming in 012 but, whomever created mock data used these so ill be using them aswell.

const getStatusStyle = (status: string) =>
  Object.hasOwn(STATUS, status)
    ? STATUS[status as keyof typeof STATUS]
    : STATUS.UNKNOWN;

type Props =
  | {
      requirement: StationRequirement;
      mode: "needed-only";
    }
  | {
      requirement: StationRequirement;
      mode?: "live-coverage";
      deployments: ActiveDeployments;
    };

export default function StationRow(props: Props) {
  const { requirement } = props;
  const mode = props.mode ?? "live-coverage";
  const stationState =
    props.mode === "needed-only"
      ? null
      : getStationState(
          props.deployments,
          requirement.station,
          requirement.minimumStaffing,
        );

  const statuses = stationState?.statuses ?? [];
  const current = stationState?.current ?? 0;
  const lastUpdate = stationState?.lastUpdate ?? null;

  const [open, setOpen] = useState(false);
  if (props.mode === "needed-only") {
    return (
      <View style={[box, { margin: 8 }]}>
        <Text style={text.title}>{requirement.station}</Text>

        <Text style={text.body}>Placement: {requirement.placement}</Text>

        <Text style={text.body}>
          Minimum staffing: {requirement.minimumStaffing} stewards
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => setOpen(!open)}
      style={[
        box,
        {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          margin: 8,
        },
      ]}
    >
      <Text style={text.title}>
        {requirement.station} - {current}/{requirement.minimumStaffing} stewards
      </Text>

      <View style={{ flexDirection: "row", marginLeft: 12 }}>
        {statuses.map((status, index) => {
          const { color, symbol } = getStatusStyle(status);
          return (
            <View
              key={index}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 6,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14 }}>{symbol}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={[text.body, { fontWeight: "bold" }]}>
          Last update: {formatTime(lastUpdate)}
        </Text>
      </View>

      {open && (
        <View style={{ width: "100%", marginTop: 8 }}>
          <Text style={[text.body, { fontWeight: "bold" }]}>
            {requirement.placement}
          </Text>
          {(requirement.actions ?? []).map((a) => (
            <Text key={a.sequence} style={text.body}>
              {a.sequence}. {a.instruction}
            </Text>
          ))}
          {statuses.map((status, i) => (
            <Text key={i} style={text.body}>
              Steward {i + 1}: {status}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}
