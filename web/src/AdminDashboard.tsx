import { useState } from "react";
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
    <main className="admin-dashboard user-admin-dashboard">
      <header className="admin-header">
        <h1>Admin</h1>
        <button onClick={onLogout} type="button">
          Log ud
        </button>
      </header>
      <>
        <button
          className="admin-back"
          type="button"
          onClick={() => setPage("home")}
        >
          Tilbage
        </button>
        <UserAdmin token={token} />
      </>
    </main>
  );
}
