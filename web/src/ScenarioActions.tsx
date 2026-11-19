import { use } from "react";
import { createPortal } from "react-dom";
import { ActionsSlotContext } from "./components/OperatorSections";

// The action card, rendered into the slot that OperatorDashboard provides.
// Switching previews another scenario without stopping the current one.
export function ScenarioActions({
  isActive,
  hasActive,
  busy,
  switching,
  canCancel,
  canStart,
  targetName,
  onSwitch,
  onCancel,
  onRequestConfirm,
}: {
  isActive: boolean;
  hasActive: boolean;
  busy: boolean;
  switching: boolean;
  canCancel: boolean;
  canStart: boolean;
  // The scenario the buttons act on, for screen readers.
  targetName: string;
  onSwitch: () => void;
  onCancel: () => void;
  onRequestConfirm: () => void;
}) {
  const slot = use(ActionsSlotContext);
  if (!slot) return null;
  return createPortal(
    <div className="scenario-actions">
      {isActive && hasActive && (
        <button
          type="button"
          className="scenario-switch"
          disabled={busy}
          onClick={onSwitch}
        >
          Skift scenarie
        </button>
      )}
      {!isActive && (
        <button
          type="button"
          className="scenario-cancel"
          disabled={busy || (!switching && !canCancel)}
          onClick={onCancel}
        >
          Annuller
        </button>
      )}
      {isActive ? (
        <button
          type="button"
          className="scenario-stop"
          aria-label={`STOP scenarie: ${targetName}`}
          onClick={onRequestConfirm}
          disabled={busy}
        >
          {/* Short verbs, as in the design; the label adds the target. */}
          STOP scenarie
        </button>
      ) : (
        <button
          type="button"
          className="scenario-start"
          aria-label={`START scenarie: ${targetName}`}
          onClick={onRequestConfirm}
          disabled={!canStart}
        >
          START scenarie
        </button>
      )}
    </div>,
    slot,
  );
}
