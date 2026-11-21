import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import "./StationSelect.css";
import {
  TaskPicker,
  WeekdaySelect,
  TimePicker,
} from "./ScenarioStaffingControls";
export { validStaffingDays } from "./ScenarioStaffingControls";

export type StationStaffing = {
  station: string;
  placement: string;
  minimumStaffing: number;
  tasks: { id: number; instruction: string }[];
  windows?: {
    id: number;
    dayPattern: string;
    startTime: string;
    endTime: string;
  }[];
};

type Props = {
  stations: string[];
  stoppingStations: string[];
  renderMap: (
    onStationPress: (station: string) => void,
    markedStations: string[],
  ) => ReactNode;
  stationNames?: Readonly<Record<string, string>>;
  staffing: StationStaffing[];
  setStaffing: Dispatch<SetStateAction<StationStaffing[]>>;
  onBack: () => void;
  scenarioId: string;
  setScenarioId: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
};

type StationDetailsProps = {
  selected: StationStaffing;
  stationNames?: Readonly<Record<string, string>>;
  stoppingStations: string[];
  emptyCounts: ReadonlySet<string>;
  setEmptyCounts: Dispatch<SetStateAction<ReadonlySet<string>>>;
  update: (station: string, change: Partial<StationStaffing>) => void;
  addTasks: (station: string, instructions: string[]) => void;
  onRemove: () => void;
};

function StationDetails({
  selected,
  stationNames,
  stoppingStations,
  emptyCounts,
  setEmptyCounts,
  update,
  addTasks,
  onRemove,
}: StationDetailsProps) {
  const station = selected.station;
  return (
    <section className="admin-staffing-station" key={station}>
      <div className="admin-staffing-station-heading">
        <div>
          <span className="admin-staffing-marker" aria-hidden="true" />
          <strong title={stationNames?.[station] || station}>{station}</strong>
        </div>
        <button
          type="button"
          className="admin-staffing-remove"
          onClick={onRemove}
          aria-label={`Fjern bemanding for ${station}`}
        >
          Fjern bemanding
        </button>
      </div>
      {!stoppingStations.includes(station) && (
        <p className="admin-staffing-no-stop">
          Ingen af scenariets linjer standser her. Stationen kan stadig
          bemandes.
        </p>
      )}
      <div className="admin-staffing-details">
        <div className="admin-staffing-fields">
          <label>
            Antal medarbejdere
            <input
              type="number"
              min={1}
              max={2147483647}
              step={1}
              value={emptyCounts.has(station) ? "" : selected.minimumStaffing}
              onChange={(event) => {
                if (event.target.value === "") {
                  setEmptyCounts((current) => new Set(current).add(station));
                  return;
                }
                const count = event.target.valueAsNumber;
                if (
                  Number.isInteger(count) &&
                  count >= 1 &&
                  count <= 2147483647
                ) {
                  setEmptyCounts((current) => {
                    const next = new Set(current);
                    next.delete(station);
                    return next;
                  });
                  update(station, { minimumStaffing: count });
                }
              }}
            />
          </label>
          <label>
            <span>
              Placering
              <span className="admin-optional">valgfrit</span>
            </span>
            <input
              type="text"
              value={selected.placement}
              onChange={(event) =>
                update(station, {
                  placement: event.target.value,
                })
              }
              placeholder="F.eks. ved rulletrappen"
            />
          </label>
        </div>
        <fieldset className="admin-staffing-windows">
          <legend>
            Bemandingstider
            <span className="admin-optional">valgfrit</span>
          </legend>
          {(selected.windows ?? []).map((window, index) => (
            <div className="admin-staffing-window" key={window.id}>
              {(["Fra dag", "Til dag"] as const).map((label, part) => {
                const days = window.dayPattern
                  .toLocaleLowerCase("da")
                  .split("–");
                return (
                  <WeekdaySelect
                    key={label}
                    label={`${label} for bemandingstid ${index + 1} på ${station}`}
                    fieldLabel={label}
                    value={days[part] ?? ""}
                    onChange={(value) => {
                      days[part] = value;
                      update(station, {
                        windows: (selected.windows ?? []).map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                dayPattern: `${days[0] ?? ""}–${days[1] ?? ""}`,
                              }
                            : item,
                        ),
                      });
                    }}
                  />
                );
              })}
              {(["Fra", "Til"] as const).map((label) => {
                const field = label === "Fra" ? "startTime" : "endTime";
                return (
                  <div className="admin-time-field" key={field}>
                    <span>{label} kl.</span>
                    <TimePicker
                      label={`${label} for bemandingstid ${index + 1} på ${station}`}
                      value={window[field]}
                      onChange={(value) =>
                        update(station, {
                          windows: (selected.windows ?? []).map((item, i) =>
                            i === index ? { ...item, [field]: value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                );
              })}
              <button
                type="button"
                className="admin-task-remove admin-window-remove"
                aria-label={`Fjern bemandingstid ${index + 1} for ${station}`}
                onClick={() =>
                  update(station, {
                    windows: (selected.windows ?? []).filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                Fjern tid
              </button>
            </div>
          ))}
          <button
            type="button"
            className="admin-secondary admin-add-window"
            onClick={() =>
              update(station, {
                windows: [
                  ...(selected.windows ?? []),
                  {
                    id:
                      Math.max(
                        0,
                        ...(selected.windows ?? []).map((item) => item.id),
                      ) + 1,
                    dayPattern: "",
                    startTime: "12:00",
                    endTime: "12:15",
                  },
                ],
              })
            }
          >
            + Tilføj bemandingstid
          </button>
        </fieldset>
        <fieldset>
          <legend>
            Opgaver
            <span className="admin-optional">valgfrit</span>
          </legend>
          {selected.tasks.map((task, index) => (
            <div className="admin-task-row" key={task.id}>
              <label>
                Opgave {index + 1}
                <input
                  type="text"
                  value={task.instruction}
                  onChange={(event) =>
                    update(station, {
                      tasks: selected.tasks.map((item) =>
                        item.id === task.id
                          ? {
                              ...item,
                              instruction: event.target.value,
                            }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="admin-task-remove"
                onClick={() =>
                  update(station, {
                    tasks: selected.tasks.filter((item) => item.id !== task.id),
                  })
                }
                aria-label={`Fjern opgave ${index + 1} for ${station}`}
              >
                Fjern
              </button>
            </div>
          ))}
          <TaskPicker
            station={station}
            tasks={selected.tasks}
            onAdd={(instructions) => addTasks(station, instructions)}
          />
        </fieldset>
      </div>
    </section>
  );
}

export function ScenarioStaffing({
  stations,
  stoppingStations,
  renderMap,
  stationNames,
  staffing,
  setStaffing,
  onBack,
  scenarioId,
  setScenarioId,
  onSave,
  saving,
  saveError,
}: Props) {
  const [activeStation, setActiveStation] = useState<string | null>(
    () => staffing[0]?.station ?? null,
  );
  const selected = staffing.find((item) => item.station === activeStation);
  const [emptyCounts, setEmptyCounts] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const hasEmptyCount = staffing.some((item) => emptyCounts.has(item.station));
  function selectStation(station: string) {
    setStaffing((current) =>
      current.some((item) => item.station === station)
        ? current
        : [
            ...current,
            { station, placement: "", minimumStaffing: 1, tasks: [] },
          ],
    );
    setActiveStation(station);
  }
  function update(station: string, change: Partial<StationStaffing>) {
    setStaffing((current) =>
      current.map((item) =>
        item.station === station ? { ...item, ...change } : item,
      ),
    );
  }

  function addTasks(station: string, instructions: string[]) {
    setStaffing((current) =>
      current.map((item) => {
        if (item.station !== station) return item;
        const firstId = Math.max(0, ...item.tasks.map((task) => task.id)) + 1;
        return {
          ...item,
          tasks: [
            ...item.tasks,
            ...instructions.map((instruction, index) => ({
              id: firstId + index,
              instruction,
            })),
          ],
        };
      }),
    );
  }

  function toggle(station: string, checked: boolean) {
    if (!checked)
      setEmptyCounts((current) => {
        const next = new Set(current);
        next.delete(station);
        return next;
      });
    setStaffing((current) =>
      checked
        ? [
            ...current,
            { station, placement: "", minimumStaffing: 1, tasks: [] },
          ]
        : current.filter((item) => item.station !== station),
    );
  }

  return (
    <section
      className="admin-workspace admin-staffing-workspace"
      aria-label="Bemanding"
    >
      <aside className="admin-sidebar admin-staffing-sidebar">
        <h1>Bemanding</h1>
        <p className="admin-muted">
          Vælg stationer på kortet og tilføj bemanding.
        </p>
        <h2>
          Valgte stationer{" "}
          <span className="admin-count-badge">{staffing.length}</span>
        </h2>
        {staffing.length === 0 ? (
          <p className="admin-muted">Ingen stationer valgt endnu.</p>
        ) : (
          <div className="admin-staffing-nav">
            {[...staffing]
              .sort(
                (a, b) =>
                  stations.indexOf(a.station) - stations.indexOf(b.station),
              )
              .map((item) => (
                <button
                  type="button"
                  key={item.station}
                  aria-pressed={item.station === activeStation}
                  onClick={() => setActiveStation(item.station)}
                  title={stationNames?.[item.station] || item.station}
                >
                  <span>
                    <strong>{item.station}</strong>
                    <small>{stationNames?.[item.station]}</small>
                  </span>
                  <span>
                    {item.minimumStaffing}{" "}
                    {item.minimumStaffing === 1
                      ? "medarbejder"
                      : "medarbejdere"}
                  </span>
                </button>
              ))}
          </div>
        )}
        <div className="admin-staffing-review" aria-label="Gennemgå scenarie">
          <section className="admin-staffing-card admin-save-card">
            <button
              type="button"
              className="admin-staffing-back"
              onClick={onBack}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5m6-6-6 6 6 6" />
              </svg>
              Tilbage til linjer
            </button>
            <label>
              Scenarie-ID
              <input
                value={scenarioId}
                onChange={(event) => setScenarioId(event.target.value)}
                placeholder="Indtast scenarie-ID"
                required
              />
            </label>
            {saveError && (
              <p className="admin-save-error" role="alert">
                {saveError}
              </p>
            )}
            {hasEmptyCount && (
              <p className="admin-save-error" role="alert">
                Angiv antal medarbejdere for alle valgte stationer.
              </p>
            )}
            <button
              type="button"
              className="admin-primary admin-save-button"
              disabled={!scenarioId.trim() || saving || hasEmptyCount}
              onClick={onSave}
            >
              {saving ? "Gemmer…" : "Gem scenarie"}
            </button>
          </section>
        </div>
      </aside>
      <section className="admin-map-panel" aria-label="Kort">
        <h2>Oversigt</h2>
        <p className="admin-map-instruction">
          Klik på en station for at tilføje eller redigere bemanding.
        </p>
        {renderMap(
          selectStation,
          staffing.map((item) => item.station),
        )}
      </section>
      <aside
        className="admin-form-panel admin-staffing-form"
        aria-label="Stationsdetaljer"
      >
        <h2>Stationsdetaljer</h2>
        {!selected ? (
          <p className="admin-muted">
            Vælg en station på kortet for at tilføje bemanding.
          </p>
        ) : (
          <StationDetails
            key={selected.station}
            selected={selected}
            stationNames={stationNames}
            stoppingStations={stoppingStations}
            emptyCounts={emptyCounts}
            setEmptyCounts={setEmptyCounts}
            update={update}
            addTasks={addTasks}
            onRemove={() => {
              toggle(selected.station, false);
              setActiveStation(null);
            }}
          />
        )}
      </aside>
    </section>
  );
}
