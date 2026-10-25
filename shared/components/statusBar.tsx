import { Text, View } from "react-native";
import { box, colors, text } from "../Theme";
import type { ScenarioState } from "../types/v1/scenario-state";
import { STATUS, type StationRequirement } from "./stationRow";
import { countByStatus, countManned, formatTime } from "./stationState";
import type { ReactNode } from "react";

type Props = {
  state: ScenarioState | null;
  scenarioName?: string;
  requirements: Pick<StationRequirement, "station" | "minimumStaffing">[];
  isConnected: boolean;
  lastUpdate?: string | null;
  now: Date;
};

export function formatDuration(startedAt: string, now: Date) {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "--:--:--";
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));
  const pad = (n: number) => n.toString().padStart(2, "0");
  return [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds / 60) % 60),
    totalSeconds % 60,
  ]
    .map(pad)
    .join(":");
}
function Metric({
  label,
  value,
  total,
  color,
  children,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  children?: ReactNode;
}) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={text.body}>
        <Text style={{ fontSize: 28, fontWeight: "700", color }}>{value}</Text>{" "}
        af {total}
      </Text>
      {/* The bar: a filled part and an empty part, sized by flex */}
      <View style={{ flexDirection: "row", height: 4, marginTop: 4 }}>
        <View style={{ flex: ratio, backgroundColor: color }} />
        <View style={{ flex: 1 - ratio, backgroundColor: colors.page }} />
      </View>
      {children}
    </View>
  );
}
function ActiveData({
  state,
  scenarioName,
  requirements,
  now,
}: {
  state: ScenarioState;
  scenarioName?: string;
  requirements: Props["requirements"];
  now: Date;
}) {
  const covered = countManned(state, requirements);
  const required = requirements.length;
  const counts = countByStatus(state, requirements);
  const positions = counts.MANNED + counts.PENDING + counts.UNMANNED;
  const ok = STATUS.MANNED.color;
  const bad = STATUS.UNMANNED.color;

  return (
    <>
      <Text style={text.title}>
        {state.scenarioId}
        {scenarioName ? ` ${scenarioName}` : ""}
      </Text>
      <Text style={[text.body, { marginBottom: 12 }]}>
        Activated by {state.actor} · Active for{" "}
        {formatDuration(state.startedAt, now)}
      </Text>

      <Metric
        label="Stations covered"
        value={covered}
        total={required}
        color={covered < required ? bad : ok}
      >
        <Text style={text.body}>
          {covered < required
            ? `⚠ ${required - covered} with gaps`
            : "✓ All covered"}
        </Text>
      </Metric>

      <Metric
        label="Stewards on stations"
        value={counts.MANNED}
        total={positions}
        color={counts.MANNED < positions ? bad : ok}
      >
        <Text style={text.body}>
          {STATUS.MANNED.symbol} {counts.MANNED} manned ·{" "}
          {STATUS.PENDING.symbol} {counts.PENDING} pending ·{" "}
          {STATUS.UNMANNED.symbol} {counts.UNMANNED} unmanned
        </Text>
      </Metric>
    </>
  );
}
export default function StatusBar({
  state,
  scenarioName,
  requirements,
  isConnected,
  lastUpdate,
  now,
}: Props) {
  const active = state?.status === "ACTIVE" ? state : null;

  return (
    <View
      accessibilityRole="summary"
      style={[box, { backgroundColor: colors.background, padding: 12 }]}
    >
      {active ? (
        <ActiveData
          state={active}
          scenarioName={scenarioName}
          requirements={requirements}
          now={now}
        />
      ) : (
        <Text style={[text.title, { marginBottom: 12 }]}>
          No active scenario
        </Text>
      )}

      <Text
        style={{
          color: isConnected ? STATUS.MANNED.color : STATUS.UNMANNED.color,
        }}
      >
        {isConnected
          ? `● Live · updated ${formatTime(lastUpdate)}`
          : "⚠ Disconnected · data may be out of date"}
      </Text>
    </View>
  );
}
