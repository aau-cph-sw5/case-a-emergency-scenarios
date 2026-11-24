import { useState } from "react";
import { operatorCssVars } from "../../shared/Theme";
import { TopBar } from "./components/TopBar";
import { UserAdmin } from "./components/UserAdmin";
import { ScenarioBuilder } from "./ScenarioBuilder";

type Page = "home" | "users";

export function AdminDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<Page>("home");
  if (page === "home")
    return (
      <ScenarioBuilder
        token={token}
        onLogout={onLogout}
        onUsers={() => setPage("users")}
      />
    );
  return (
    <main
      className="admin-dashboard user-admin-dashboard"
      style={operatorCssVars}
    >
      <TopBar name="Admin" onLogout={onLogout} />
      <div className="user-admin-card">
        <button
          className="admin-back"
          type="button"
          onClick={() => setPage("home")}
        >
          Tilbage
        </button>
        <UserAdmin token={token} />
      </div>
    </main>
  );
}
