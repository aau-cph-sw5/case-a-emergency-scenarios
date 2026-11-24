import type { ReactNode } from "react";

// The dark top bar shared by the operator and admin views (classes live in
// OperatorSections.css), so both roles look like one product. `center` sits
// between brand and profile; `beforeName` sits before the name in the profile.
export function TopBar({
  name,
  onLogout,
  center,
  beforeName,
}: {
  name: ReactNode;
  onLogout: () => void;
  center?: ReactNode;
  beforeName?: ReactNode;
}) {
  return (
    <header className="operator-topbar">
      <div className="operator-brand">
        <span className="brand-mark" aria-hidden="true">
          M
        </span>
        <strong>Metro Service</strong>
      </div>
      {center}
      <div className="operator-profile">
        {beforeName}
        <strong>{name}</strong>
        <button className="logout-button" onClick={onLogout} type="button">
          Log ud
        </button>
      </div>
    </header>
  );
}
