import type { LineGroupLabel } from "../../shared/auth/line-groups";

// The M1/M2 vs M3/M4 toggle in the top bar, with the operator avatar.
export function OperatorLineSwitcher({
  lineGroup,
  onChange,
}: {
  lineGroup: LineGroupLabel;
  onChange: (lineGroup: LineGroupLabel) => void;
}) {
  return (
    <>
      <div
        className="operator-line-switcher"
        role="group"
        aria-label="Vælg metrolinjer"
      >
        <button
          type="button"
          aria-pressed={lineGroup === "M1/M2"}
          onClick={() => onChange("M1/M2")}
        >
          M1 / M2
        </button>
        <button
          type="button"
          aria-pressed={lineGroup === "M3/M4"}
          onClick={() => onChange("M3/M4")}
        >
          M3 / M4
        </button>
      </div>
      <span className="operator-avatar" aria-hidden="true">
        OP
      </span>
    </>
  );
}
