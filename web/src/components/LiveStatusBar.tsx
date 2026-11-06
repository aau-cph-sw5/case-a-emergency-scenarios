import { Text, View } from "react-native";
import {
  formatDuration,
  formatTime,
} from "../../../shared/components/statusBar";
import {
  countManned,
  countStewards,
} from "../../../shared/components/stationState";
import { box, spacing, text } from "../../../shared/Theme";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";
import { useNow } from "../useNow";

export function LiveStatusBar() {
  const {
    activations,
    isConnected,
    lastUpdatedAt,
    error: liveError,
  } = useLiveData();
  const activation = activations.at(-1) ?? null;
  const { scenario, error } = useScenario(activation?.scenarioId ?? null);
  const now = useNow();

  if (activation === null) return null;

  if (scenario === null) {
    return (
      <View style={[box, { padding: spacing.large }]}>
        <Text style={text.body}>{error ?? "Henter scenarie..."}</Text>
      </View>
    );
  }
  const version = scenario.versions.find(
    (v) => v.version === scenario.currentVersion,
  );
  if (version === undefined) {
    return (
      <View style={box}>
        <Text role="alert" style={text.body}>
          Scenariets aktuelle version blev ikke fundet.
        </Text>
      </View>
    );
  }
  const requirements = version.stationRequirements;
  const covered = countManned(activation, requirements);
  const stewards = countStewards(activation, requirements);
  const connected = isConnected && liveError === null;
  return (
    <View
      accessibilityRole="summary"
      style={{
        borderWidth: 1,
        borderColor: "#e0e7e8",
        borderRadius: 10,
        backgroundColor: "#f7f9f9",
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 4,
          marginBottom: 7,
        }}
      >
        <Text style={{ color: "#68777d", fontSize: 12, fontWeight: "600" }}>
          Aktivt scenarie
        </Text>
        <Text style={{ color: "#68777d", fontSize: 12, fontWeight: "600" }}>
          Aktiv i {formatDuration(activation.startedAt, now)}
        </Text>
      </View>
      <Text
        style={{
          color: "#182127",
          fontSize: 16,
          fontWeight: "700",
          lineHeight: 21,
        }}
      >
        {activation.scenarioId} {scenario.name}
      </Text>
      <View
        style={{ height: 1, backgroundColor: "#dce5e5", marginVertical: 14 }}
      />
      <SummaryMetric
        label="Stationer dækket"
        value={covered}
        total={requirements.length}
        detail={
          covered < requirements.length
            ? `${requirements.length - covered} mangler dækning`
            : "Alle dækket"
        }
      />
      <SummaryMetric
        label="Stewards på stationer"
        value={stewards.arrived}
        total={stewards.needed}
        detail={`${stewards.enRoute} på vej`}
      />
      <View
        style={{
          borderTopWidth: 1,
          borderColor: "#dce5e5",
          paddingTop: 11,
          marginTop: 1,
        }}
      >
        <Text
          style={{
            color: connected ? "#007d55" : "#aa2923",
            fontSize: 12,
            fontWeight: "600",
            lineHeight: 18,
          }}
        >
          {connected
            ? `● Live · opdateret ${formatTime(lastUpdatedAt?.toISOString())}`
            : liveError
              ? `⚠ Kunne ikke opdatere · informationen kan være forældet`
              : "⚠ Forbindelsen er afbrudt · informationen kan være forældet"}
        </Text>
      </View>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  total,
  detail,
}: {
  label: string;
  value: number;
  total: number;
  detail: string;
}) {
  const complete = value >= total;
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  const color = complete ? "#007d55" : "#c52b24";
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          style={{ color: "#43565b", fontSize: 12, fontWeight: "700", flex: 1 }}
        >
          {label}
        </Text>
        <Text style={{ color, fontSize: 17, fontWeight: "700" }}>
          {value}
          <Text style={{ color: "#66777a", fontSize: 12, fontWeight: "500" }}>
            {" "}
            / {total}
          </Text>
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          height: 5,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: "#dfe7e7",
          marginTop: 8,
        }}
      >
        <View style={{ flex: ratio, backgroundColor: color }} />
        <View style={{ flex: 1 - ratio }} />
      </View>
      <Text style={{ color: "#66777a", fontSize: 11, marginTop: 5 }}>
        {detail}
      </Text>
    </View>
  );
}
