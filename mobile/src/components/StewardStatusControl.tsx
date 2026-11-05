import { StyleSheet, Text, View } from "react-native";
import {
  box,
  colors,
  stewardStatus,
  surface,
  text,
} from "../../../shared/Theme";
import type { OwnStatus } from "../data/steward-status";
import { SlideToConfirm } from "./SlideToConfirm";

export type StationCoverage = {
  arrived: number;
  enRoute: number;
  needed: number;
};

// The steward's own status in the active scenario (MET-A-015, #263): no
// status, on the way or arrived. Only the next valid action is offered.
// Choosing a station happens with + in "Påvirkede stationer"; arrival is
// confirmed with a slide, so it is not sent by accident. Colours, words and
// symbols come from Theme.tsx.
export function StewardStatusControl({
  own,
  coverage,
  blockedReason,
  sending,
  error,
  onArrive,
  onCheckOut,
}: {
  own: OwnStatus | null;
  coverage: StationCoverage | null;
  // Why the status cannot be changed right now, e.g. the saved offline copy.
  blockedReason: string | null;
  sending: boolean;
  error: string | null;
  onArrive: () => void;
  onCheckOut: () => void;
}) {
  const pending = stewardStatus.PENDING;
  const manned = stewardStatus.MANNED;

  return (
    <View style={styles.container}>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      {blockedReason && (
        <Text style={styles.blocked} accessibilityRole="alert">
          {blockedReason}
        </Text>
      )}

      {own === null && (
        <View style={styles.noStatus}>
          <Text style={styles.heading}>Ingen status</Text>
          <Text style={styles.body}>
            Tryk + ved en station under Påvirkede stationer for at melde dig på
            vej.
          </Text>
        </View>
      )}

      {own?.status === "PENDING" && (
        <View style={[styles.banner, { backgroundColor: colors.statusYellow }]}>
          <Text style={styles.bannerTitle} accessibilityRole="header">
            DU ER {pending?.label.toUpperCase()}
          </Text>
          <Text style={styles.body}>
            Du er registreret som {pending?.label.toLowerCase()} til{" "}
            {own.station}.
          </Text>
        </View>
      )}

      {own?.status === "MANNED" && (
        <View style={[styles.banner, { backgroundColor: colors.statusGreen }]}>
          <Text
            style={[styles.bannerTitle, styles.inverse]}
            accessibilityRole="header"
          >
            {manned?.symbol ? `${manned.symbol} ` : ""}DU ER{" "}
            {manned?.label.toUpperCase()}
          </Text>
          <Text style={[styles.body, styles.inverse]}>
            Du er tjekket ind på {own.station}.
          </Text>
        </View>
      )}

      {own !== null && (
        <View style={styles.stationCard}>
          <Text style={styles.caption}>STATION</Text>
          <Text style={styles.stationName}>{own.station}</Text>
          <View style={styles.statusLine}>
            <Text style={styles.caption}>STATUS</Text>
            <Text
              style={[
                styles.chip,
                {
                  backgroundColor:
                    own.status === "MANNED"
                      ? colors.statusGreen
                      : colors.statusYellow,
                  color:
                    own.status === "MANNED" ? colors.textInverse : colors.text,
                },
              ]}
            >
              {(
                stewardStatus[own.status]?.label ?? "Ingen status"
              ).toUpperCase()}
            </Text>
          </View>
          {coverage && coverage.needed > 0 && (
            <>
              <Text style={styles.coverage}>
                {coverage.arrived} af {coverage.needed} ankommet
                {coverage.enRoute > 0 ? ` · ${coverage.enRoute} på vej` : ""}
              </Text>
              <View style={styles.bars}>
                {Array.from({ length: coverage.needed }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      i < coverage.arrived && {
                        backgroundColor: colors.statusGreen,
                      },
                      i >= coverage.arrived &&
                        i < coverage.arrived + coverage.enRoute && {
                          backgroundColor: colors.statusYellow,
                        },
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {own?.status === "PENDING" && (
        <SlideToConfirm
          label="GODKEND ANKOMST"
          color={colors.statusGreen}
          disabled={blockedReason !== null || sending}
          onConfirm={onArrive}
        />
      )}

      {own?.status === "MANNED" && (
        <SlideToConfirm
          label="TJEK UD"
          color={colors.statusGreen}
          disabled={blockedReason !== null || sending}
          onConfirm={onCheckOut}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  error: {
    ...text.body,
    color: colors.statusRed,
    fontWeight: "600",
    marginBottom: 8,
  },
  blocked: {
    ...text.body,
    color: colors.text,
    fontWeight: "600",
    marginBottom: 8,
  },
  noStatus: {
    ...surface,
    ...box,
    padding: 12,
  },
  heading: {
    ...text.header,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    ...text.body,
    color: colors.text,
  },
  inverse: {
    color: colors.textInverse,
  },
  banner: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
  },
  bannerTitle: {
    ...text.title,
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  stationCard: {
    backgroundColor: colors.active,
    borderRadius: 12,
    padding: 16,
  },
  caption: {
    color: colors.textInverse,
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.7,
  },
  stationName: {
    ...text.title,
    color: colors.textInverse,
    fontSize: 22,
    marginBottom: 12,
  },
  statusLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chip: {
    borderRadius: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coverage: {
    color: colors.textInverse,
    fontWeight: "700",
    marginBottom: 6,
  },
  bars: {
    flexDirection: "row",
    gap: 4,
  },
  bar: {
    backgroundColor: colors.subtleBorder,
    borderRadius: 2,
    flex: 1,
    height: 6,
  },
});
