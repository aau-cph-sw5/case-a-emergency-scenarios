import { useEffect, useRef } from "react";

// A native modal <dialog> traps focus and closes on Escape, which counts as
// Cancel. Nothing happens unless the accept button is pressed
// (MET-A-007, criterion 2).
export function ConfirmDialog({
  headingId,
  title,
  acceptLabel,
  warning = false,
  onConfirm,
  onCancel,
}: {
  headingId: string;
  title: string;
  acceptLabel: string;
  warning?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="operator-confirm"
      onClose={onCancel}
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className={warning ? "confirm-warning" : undefined}>
        {title}
      </h3>
      <div className="confirm-actions">
        <button
          type="button"
          className="confirm-cancel"
          onClick={() => dialogRef.current?.close()}
        >
          Annullér
        </button>
        <button type="button" className="confirm-accept" onClick={onConfirm}>
          {acceptLabel}
        </button>
      </div>
    </dialog>
  );
}
