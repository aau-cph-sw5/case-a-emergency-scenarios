import { Text } from "react-native";
import { colors, stewardStatus } from "../../../shared/Theme";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";

// A steward's status as symbol and word in the status colour. Meant to sit
// inside a line of text.
export function StewardStatus({
  status,
}: {
  status?: ScenarioState["deployments"][number]["status"] | null;
}) {
  const look = status ? stewardStatus[status] : undefined;
  if (look === undefined) {
    return <Text style={{ color: colors.text }}>Ingen status</Text>;
  }
  return (
    <Text style={{ color: look.color, fontWeight: "600" }}>
      {look.symbol ? `${look.symbol} ` : ""}
      {look.label}
    </Text>
  );
}
