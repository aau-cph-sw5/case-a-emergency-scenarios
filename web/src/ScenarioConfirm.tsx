import { ConfirmDialog } from "./ConfirmDialog";

function activationTitle(name: string, outgoing: string[]) {
  return outgoing.length > 0
    ? `Er du sikker på, at du vil skifte fra ${outgoing.map((n) => `“${n}”`).join(", ")} til “${name}”?`
    : `Aktivér “${name}”?`;
}

// The confirmation for the action card: stand the active scenario down, or
// activate the selected one (naming any scenario it replaces).
export function ScenarioConfirm({
  name,
  isActive,
  outgoingNames,
  onStandDown,
  onActivate,
  onCancel,
}: {
  name: string;
  isActive: boolean;
  outgoingNames: string[];
  onStandDown: () => void;
  onActivate: () => void;
  onCancel: () => void;
}) {
  if (isActive) {
    return (
      <ConfirmDialog
        headingId="confirm-stand-down-heading"
        title={`Vil du deaktivere “${name}”?`}
        acceptLabel="Deaktivér"
        warning
        onConfirm={onStandDown}
        onCancel={onCancel}
      />
    );
  }
  return (
    <ConfirmDialog
      headingId="confirm-activation-heading"
      title={activationTitle(name, outgoingNames)}
      acceptLabel="Bekræft"
      onConfirm={onActivate}
      onCancel={onCancel}
    />
  );
}
