import { useEffect, useState } from "react";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";
import { LiveStatusBar } from "./components/LiveStatusBar";

// The time and date in the header, as "17:30" and "06-11-2026".
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now
    .toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replaceAll(".", "-");
  return (
    <time className="operator-clock" dateTime={now.toISOString()}>
      <span>{time.replace(".", ":")}</span>
      <span>{date}</span>
    </time>
  );
}

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
  return (
    <main className="operator-dashboard">
      <header className="operator-topbar">
        <div className="operator-brand">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <strong>Metro Service</strong>
        </div>
        <Clock />
        <div className="operator-profile">
          <span className="operator-avatar" aria-hidden="true">
            OP
          </span>
          <strong>Operator</strong>
          <button className="logout-button" onClick={onLogout} type="button">
            Log ud
          </button>
        </div>
      </header>
      <ScenarioWorkspace
        token={token}
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusBar={<LiveStatusBar />}
      />
    </main>
  );
}
