import { RoleView } from "./RoleView";

export function StewardView({ onLogout }: { onLogout: () => void }) {
  return (
    <RoleView
      title="Steward"
      description="Logget ind som steward."
      onLogout={onLogout}
    />
  );
}
