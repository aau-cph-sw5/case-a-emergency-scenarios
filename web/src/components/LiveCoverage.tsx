import { Text, View } from "react-native";
import { text } from "../../../shared/Theme";
import ScenarioStationList from "../../../shared/components/stationView";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";

// The station coverage of the active scenario (MET-A-011, #184). It reads
// only from the data layer, which loads again on "activations-changed" and on
// reconnect, so a new position report updates the list without a refresh.
export function LiveCoverage() {
  const {
    activations,
    isConnected,
    isLoading,
    error: liveError,
  } = useLiveData();
  // The newest activation, as the dashboard showed before.
  const active = activations.at(-1) ?? null;
  const { scenario, error } = useScenario(active?.scenarioId ?? null);

  if (isLoading) return <Text style={text.body}>Henter dækning…</Text>;
  // With nothing loaded yet, a failed load must not read as "nothing active".
  if (active === null && liveError !== null) {
    return (
      <Text role="alert" style={text.body}>
        Kunne ikke hente dækning: {liveError}
      </Text>
    );
  }
  if (active === null) {
    return <Text style={text.body}>Intet aktivt scenarie.</Text>;
  }
  if (error !== null) {
    return (
      <Text role="alert" style={text.body}>
        Kunne ikke hente scenariet: {error}
      </Text>
    );
  }
  if (scenario === null) return <Text style={text.body}>Henter scenarie…</Text>;

  return (
    <View>
      {/* The data layer keeps the last activations when a reload fails, so
          the cards can be out of date while the socket is still connected. */}
      {(!isConnected || liveError !== null) && (
        <Text role="alert" style={text.body}>
          {liveError !== null
            ? `Kunne ikke opdatere: ${liveError}. Informationen kan være forældet.`
            : "Forbindelsen er afbrudt. Informationen kan være forældet."}
        </Text>
      )}
      <ScenarioStationList scenario={scenario} activeDeployments={active} />
    </View>
  );
}
