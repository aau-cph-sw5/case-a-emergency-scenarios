import { StyleSheet, Text, View } from "react-native";
import { colors, heading } from "../../../shared/Theme";
import type { PositionReport } from "../../../shared/types/v1/position-report";

export function StewardPositions({ reports }: { reports: PositionReport[] }) {
  return (
    <View role="region" aria-label="Stewardpositioner">
      <Text role="heading" aria-level={2} style={heading}>
        Stewardpositioner
      </Text>
      {reports.length === 0 ? (
        <Text style={styles.text}>Ingen positioner endnu.</Text>
      ) : (
        <View role="list">
          {reports.map((report) => (
            <Text
              role="listitem"
              key={`${report.staff}-${report.reportedAt}`}
              style={styles.text}
            >
              {report.staff} er ved {report.station}, rapporteret{" "}
              {new Date(report.reportedAt).toLocaleTimeString("da-DK")}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ text: { color: colors.text } });
