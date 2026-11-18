import { useState } from "react";
import { UserAdmin } from "./components/UserAdmin";

type Page = "home" | "users";

export function AdminDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<Page>("home");
  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin</h1>
        <button onClick={onLogout} type="button">
          Log ud
        </button>
      </header>
      {page === "home" ? (
        <nav className="admin-menu" aria-label="Administration">
          <button type="button" onClick={() => setPage("users")}>
            Brugere
          </button>
        </nav>
      ) : (
        <>
          <button
            type="button"
            className="admin-back"
            onClick={() => setPage("home")}
          >
            Tilbage
          </button>
          <UserAdmin token={token} />
        </>
      )}
    </main>
  );
}
