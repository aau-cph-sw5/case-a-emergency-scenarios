import { View } from "react-native";
import { colors, panelRadius, spacing } from "../../shared/Theme";
import "./components/OperatorSections.css";

// Initial placeholder for the analyst page: to be implemented properly in later subissue (024).
export function AnalystDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <main className="operator-dashboard">
      <header className="operator-topbar">
        <div className="operator-brand">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <strong>Metro Service</strong>
        </div>
        <div className="operator-profile">
          <span className="operator-avatar" aria-hidden="true">
            AN
          </span>
          <strong>Analyst</strong>
          <button className="logout-button" onClick={onLogout} type="button">
            Log ud
          </button>
        </div>
      </header>

      <View style={{ padding: spacing.large, alignItems: "center" }}>
        <View
          style={{
            width: "100%",
            maxWidth: 900,
            minHeight: 200,
            padding: spacing.large,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: panelRadius,
          }}
        />
      </View>
    </main>
  );
}
