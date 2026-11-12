export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <main>
      <h1>Admin</h1>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
    </main>
  );
}
