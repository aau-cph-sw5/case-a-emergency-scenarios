import { useEffect, useRef } from "react";

// A question the user must answer before going on, drawn in the app's own look
// instead of the browser's confirm box: a white 12 px card on a dimmed page,
// the safe answer ("Annuller") first and focused, the destructive one in ink
// (Operator Design Guide: 4 px controls, 12 px containers, no shadows).
// Escape and a click outside the card cancel. Classes live in AdminDashboard.css.
export function ConfirmDialog({
  message,
  confirmLabel,
  cancelLabel = "Annuller",
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        onClick={(event) => event.stopPropagation()}
      >
        <p>{message}</p>
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="admin-secondary"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button className="admin-primary" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
