import { useId, useRef, useState } from "react";
import "./StationSelect.css";

export function StationSelect({
  label,
  value,
  stations,
  stationNames,
  onChange,
}: {
  label: string;
  value: string;
  stations: string[];
  stationNames?: Readonly<Record<string, string>>;
  onChange: (station: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const visible = stations.filter((station) =>
    station
      .toLocaleLowerCase("da")
      .includes(search.trim().toLocaleLowerCase("da")),
  );

  function close() {
    setOpen(false);
    setSearch("");
  }

  function select(station: string) {
    onChange(station);
    close();
    triggerRef.current?.focus();
  }

  return (
    <div
      className="admin-station-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
          triggerRef.current?.focus();
        }
      }}
    >
      <span className="admin-station-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="admin-station-trigger"
        aria-label={label}
        title={value ? stationNames?.[value] : undefined}
        aria-expanded={open}
        aria-controls={listId}
        onMouseDown={(event) => {
          if (open) event.preventDefault();
        }}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span
          className={
            value ? "admin-station-value" : "admin-station-placeholder"
          }
        >
          {value || "Vælg station"}
        </span>
        <span className="admin-station-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="admin-station-menu"
          id={listId}
          role="group"
          aria-label={`${label}: vælg station`}
        >
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (visible[0]) select(visible[0]);
              }
            }}
            aria-label={`Søg ${label.toLocaleLowerCase("da")}`}
            placeholder="Søg station…"
          />
          <div className="admin-station-options">
            {visible.length ? (
              visible.map((station) => (
                <button
                  key={station}
                  type="button"
                  className="admin-station-option"
                  aria-label={`Vælg ${station}`}
                  title={stationNames?.[station] || station}
                  aria-pressed={station === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(station)}
                >
                  <span className="admin-station-dot" aria-hidden="true" />
                  {station}
                  {station === value && (
                    <span className="admin-station-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="admin-station-empty">Ingen stationer fundet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
