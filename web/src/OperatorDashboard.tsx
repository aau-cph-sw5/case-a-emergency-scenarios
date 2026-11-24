import { useState } from "react";
import { operatorCssVars } from "../../shared/Theme";
import { TopBar } from "./components/TopBar";
import { StewardPositions } from "./components/StewardPositions";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";
import { LiveStatusBar } from "./components/LiveStatusBar";
import { OperatorMessagePanel } from "./components/OperatorMessagePanel";
import { mockStewardPositions } from "./local-settings";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import { OperatorLineSwitcher } from "./OperatorLineSwitcher";
import { LINE_GROUP_LABELS } from "../../shared/auth/line-groups";
import { useOperatorPopups } from "./useOperatorPopups";
import { useTestNotifications } from "./useTestNotifications";

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // The map and requirements preview share the selected scenario.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { counts: testNotifications, clearStatus } = useTestNotifications();
  const {
    ownLineGroup,
    lineGroup,
    setLineGroup,
    showStatus,
    showMessages,
    openPopup,
    setOpenPopup,
  } = useOperatorPopups(token);
  return (
    <main className="operator-dashboard" style={operatorCssVars}>
      <TopBar
        center={<ActiveScenarioBanner />}
        beforeName={
          <OperatorLineSwitcher lineGroup={lineGroup} onChange={setLineGroup} />
        }
        name={
          ownLineGroup
            ? `Operator (${LINE_GROUP_LABELS[ownLineGroup]})`
            : "Operator"
        }
        onLogout={onLogout}
      />
      <ScenarioWorkspace
        token={token}
        selectedId={selectedId}
        lineGroup={lineGroup}
        onSelect={setSelectedId}
        statusBar={<LiveStatusBar />}
        statusPopup={
          showStatus && (
            <StewardPositions
              mock={mockStewardPositions}
              open={openPopup === "status"}
              onOpenChange={(open) => setOpenPopup(open ? "status" : null)}
              testNotificationCount={testNotifications?.status}
              onOpen={clearStatus}
            />
          )
        }
        messagePanel={
          showMessages && (
            <OperatorMessagePanel
              open={openPopup === "messages"}
              onOpenChange={(open) => setOpenPopup(open ? "messages" : null)}
              token={token}
              lineGroup={ownLineGroup}
              testNotificationCount={testNotifications?.messages}
            />
          )
        }
      />
    </main>
  );
}
