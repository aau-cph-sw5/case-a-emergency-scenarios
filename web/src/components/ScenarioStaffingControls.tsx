import { useEffect, useId, useRef, useState } from "react";
import "./ScenarioStaffingControls.css";

const taskSuggestions = [
  "Tag gul vest på",
  "Foretag udkald til passagererne jf. PIO's udkald",
  "Tøm tog i spor 2",
  "Tøm tog i spor 1",
  "Lav udkald og henvis til S-tog eller busser. Hav særligt fokus på rejsende til CPH via DSB.",
  "Lav udkald og henvis til M3/M4 eller busser. Hav særligt fokus på rejsende til CPH via M3/M4 og DSB.",
  "Informer PAX om eventuel pendulstamme, samt hvordan de kommer videre",
  "Giv besked til PIO, hvis der kører udkald eller tekst i PID'erne, der ikke passer til situationen.",
  "Rulletrapper skal standses, når perronen bliver for fyldt",
];

export function TaskPicker({
  station,
  tasks,
  onAdd,
}: {
  station: string;
  tasks: { instruction: string }[];
  onAdd: (instructions: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const pickerId = useId();

  function close() {
    setOpen(false);
    setSelected([]);
    setCustom("");
  }

  function add() {
    const instructions = [
      ...selected,
      ...(custom.trim() ? [custom.trim()] : []),
    ];
    if (!instructions.length) return;
    onAdd(instructions);
    close();
  }

  return (
    <div className="admin-task-picker">
      <button
        type="button"
        className="admin-secondary"
        aria-expanded={open}
        aria-controls={pickerId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        + Tilføj opgave
      </button>
      {open && (
        <div className="admin-task-picker-panel" id={pickerId}>
          <label>
            Skriv en opgave
            <input
              type="text"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="F.eks. hjælp passagerer på perronen"
            />
          </label>
          <div className="admin-task-picker-heading">
            Eller vælg standardopgaver
          </div>
          <div
            className="admin-task-options"
            role="group"
            aria-label={`Standardopgaver for ${station}`}
          >
            {taskSuggestions.map((instruction) => {
              const added = tasks.some(
                (task) => task.instruction === instruction,
              );
              return (
                <label className="admin-task-option" key={instruction}>
                  <input
                    type="checkbox"
                    checked={selected.includes(instruction)}
                    disabled={added}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelected((current) =>
                        checked
                          ? [...current, instruction]
                          : current.filter((item) => item !== instruction),
                      );
                    }}
                  />
                  <span>
                    {instruction}
                    {added && <small> · Tilføjet</small>}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="admin-task-picker-actions">
            <button
              type="button"
              className="admin-primary"
              disabled={!selected.length && !custom.trim()}
              onClick={add}
            >
              Tilføj valgte opgaver
            </button>
            <button type="button" className="admin-secondary" onClick={close}>
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const weekdays = [
  ["man", "Mandag"],
  ["tir", "Tirsdag"],
  ["ons", "Onsdag"],
  ["tor", "Torsdag"],
  ["fre", "Fredag"],
  ["lør", "Lørdag"],
  ["søn", "Søndag"],
] as const;

export function validStaffingDays(pattern: string): boolean {
  const [from, to, extra] = pattern.toLocaleLowerCase("da").split("–");
  return (
    extra === undefined &&
    weekdays.some(([day]) => day === from) &&
    weekdays.some(([day]) => day === to)
  );
}

export function WeekdaySelect({
  label,
  fieldLabel,
  value,
  onChange,
}: {
  label: string;
  fieldLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = weekdays.find(([day]) => day === value);

  useEffect(() => {
    if (open)
      (
        menuRef.current?.querySelector<HTMLButtonElement>(
          '[aria-pressed="true"]',
        ) ?? menuRef.current?.querySelector<HTMLButtonElement>("button")
      )?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      className="admin-station-select admin-weekday-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
          return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const options = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        );
        const current = options.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const step = event.key === "ArrowDown" ? 1 : -1;
        options[(current + step + options.length) % options.length]?.focus();
      }}
    >
      <span className="admin-station-label">{fieldLabel}</span>
      <button
        ref={triggerRef}
        type="button"
        className="admin-station-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <span
          className={
            selected ? "admin-station-value" : "admin-station-placeholder"
          }
        >
          {selected?.[1] ?? "Vælg dag"}
        </span>
        <span className="admin-station-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="admin-station-menu admin-weekday-menu"
          id={menuId}
          role="group"
          aria-label={`${label}: vælg dag`}
        >
          {weekdays.map(([day, name]) => (
            <button
              key={day}
              type="button"
              className="admin-station-option"
              aria-pressed={day === value}
              onClick={() => {
                onChange(day);
                close();
              }}
            >
              {name}
              {day === value && (
                <span className="admin-station-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const replaceOnTypeRef = useRef(false);
  const [step, setStep] = useState<"hour" | "minute">("hour");
  const [hour = "12", minute = "00"] = value.split(":");
  const menuId = useId();
  function change(raw: string) {
    const digits = raw.replace(/\D/g, "");
    onChange(
      digits.length >= 2
        ? `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
        : digits,
    );
  }
  return (
    <div
      className="admin-time-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="admin-time-control">
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={value}
          placeholder="12:00"
          maxLength={5}
          onChange={(event) => change(event.target.value)}
          onClick={() => {
            replaceOnTypeRef.current = true;
          }}
          onFocus={() => {
            replaceOnTypeRef.current = true;
            setStep("hour");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              /^\d$/.test(event.key) &&
              replaceOnTypeRef.current
            ) {
              event.preventDefault();
              replaceOnTypeRef.current = false;
              onChange(event.key);
              return;
            }
            if (
              event.key === "Backspace" &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              event.currentTarget.selectionStart === 3 &&
              event.currentTarget.selectionEnd === 3 &&
              value[2] === ":"
            ) {
              event.preventDefault();
              replaceOnTypeRef.current = false;
              const input = event.currentTarget;
              change(value.slice(0, 1) + value.slice(3));
              requestAnimationFrame(() => input.setSelectionRange(1, 1));
              return;
            }
            if (
              ["ArrowLeft", "ArrowRight", "Backspace", "Delete"].includes(
                event.key,
              )
            )
              replaceOnTypeRef.current = false;
            if (event.key === "Escape" || event.key === "Enter") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="admin-time-toggle"
          aria-label={`Vælg ${label}`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            setStep("hour");
            setOpen(!open);
          }}
        >
          <svg
            className="admin-time-icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="admin-time-menu" id={menuId}>
          {step === "hour" ? (
            <>
              <strong>Vælg time</strong>
              <div
                className="admin-time-hours"
                role="group"
                aria-label={`Timer: ${label}`}
              >
                {Array.from({ length: 24 }, (_, index) => {
                  const h = String(index).padStart(2, "0");
                  return (
                    <button
                      type="button"
                      key={h}
                      aria-pressed={hour === h}
                      onClick={() => {
                        onChange(
                          `${h}:${["00", "15", "30", "45"].includes(minute) ? minute : "00"}`,
                        );
                        setStep("minute");
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="admin-time-back"
                onClick={() => setStep("hour")}
              >
                ← Time {hour}
              </button>
              <strong>Vælg minutter</strong>
              <div
                className="admin-time-minutes"
                role="group"
                aria-label={`Minutter: ${label}`}
              >
                {["00", "15", "30", "45"].map((m) => (
                  <button
                    type="button"
                    key={m}
                    aria-pressed={minute === m}
                    onClick={() => {
                      onChange(
                        `${/^([01]\d|2[0-3])$/.test(hour) ? hour : "12"}:${m}`,
                      );
                      setOpen(false);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
