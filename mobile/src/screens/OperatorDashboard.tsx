import { RoleView } from "./RoleView";

export function OperatorDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <RoleView
      title="Kontrolrum"
      description="Logget ind som operatør."
      onLogout={onLogout}
    />
  );
}
