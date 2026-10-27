import { StyleSheet, Text, View } from "react-native";
import { socket } from "./socket";
import { useSocketState } from "../../shared/socket/useSocketState";
import { usePositionReports } from "../../shared/socket/usePositionReports";
import { colors, heading, page, spacing } from "../../shared/Theme";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ActiveStationList } from "./ActiveStationList";
import { ScenarioList } from "./ScenarioList";
import { Button } from "./components/Button";
import { StewardPositions } from "./components/StewardPositions";

export function OperatorDashboard({
  token,
  activation,
  loading,
  error,
  onLogout,
}: {
  token: string;
  activation: ScenarioState | undefined;
  loading: boolean;
  error: string | null;
  onLogout: () => void;
}) {
  const { messages } = useSocketState(socket);
  const reports = usePositionReports(socket);

  return (
    <View role="main" style={styles.page}>
      <Text role="heading" aria-level={1} style={heading}>
        Nødscenarier
      </Text>
      <Button label="Log ud" onPress={onLogout} />
      {messages.length > 0 && (
        <View role="list">
          {messages.map((message) => (
            <Text role="listitem" key={message.id} style={styles.text}>
              {message.text}
            </Text>
          ))}
        </View>
      )}

      <StewardPositions reports={reports} />

      <ScenarioList token={token} />
      {error !== null ? (
        <Text role="alert" style={styles.text}>
          Kunne ikke hente aktive scenarier: {error}
        </Text>
      ) : loading ? (
        <Text role="status" style={styles.text}>
          Henter aktive scenarier…
        </Text>
      ) : activation === undefined ? (
        <Text style={styles.text}>
          Ingen aktive scenarier, så ingen stationer at vise.
        </Text>
      ) : (
        <ActiveStationList
          key={activation.scenarioId}
          token={token}
          activation={activation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { ...page, padding: spacing.lg, gap: spacing.sm },
  text: { color: colors.text },
});
