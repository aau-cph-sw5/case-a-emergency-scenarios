import type { Route, LineGroup } from "../admin-routes";
type Props = {
  lineGroup: LineGroup;
  scenarioId: string;
  setScenarioId: (value: string) => void;
  scenarioName: string;
  setScenarioName: (value: string) => void;
  routes: Route[];
  editingLine: boolean;
  onGroup: () => void;
  onCreate: () => void;
  onEdit: (route: Route) => void;
  onRemove: (id: number) => void;
  onNext: () => void;
};
export function ScenarioLineSidebar({
  lineGroup,
  scenarioId,
  setScenarioId,
  scenarioName,
  setScenarioName,
  routes,
  editingLine,
  onGroup,
  onCreate,
  onEdit,
  onRemove,
  onNext,
}: Props) {
  return (
    <aside className="admin-sidebar">
      <button className="admin-back" type="button" onClick={onGroup}>
        ← Vælg linjegruppe
      </button>
      <h1>Opret scenarie</h1>
      <p className="admin-muted">Linjegruppe: {lineGroup}</p>
      <div className="admin-scenario-details">
        <label>
          Scenarie-ID
          <input
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value)}
          />
        </label>
        <label>
          Scenarienavn
          <input
            value={scenarioName}
            onChange={(event) => setScenarioName(event.target.value)}
            required
          />
        </label>
      </div>
      <div className="admin-section-heading">
        <h2>Linjer</h2>
        <button
          className="admin-primary"
          type="button"
          onClick={onCreate}
          disabled={editingLine}
        >
          Opret linje
        </button>
      </div>
      {routes.length === 0 ? (
        <p className="admin-muted">Ingen linjer oprettet endnu.</p>
      ) : (
        <ul className="admin-route-list">
          {routes.map((route) => (
            <li key={route.id}>
              <button
                type="button"
                className="admin-route-edit"
                onClick={() => onEdit(route)}
                disabled={editingLine}
                aria-label={`Rediger linje ${route.from} til ${route.to}`}
              >
                <span
                  className="admin-route-color"
                  style={{ backgroundColor: route.color }}
                />
                <span>
                  <strong>
                    {route.from} – {route.to}
                  </strong>
                  <small>
                    {route.type === "PENDULUM"
                      ? `Pendul · Spor ${route.track}`
                      : "Tosporsdrift"}{" "}
                    · DID {route.did} · {route.maximumTrains} tog
                  </small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(route.id)}
                disabled={editingLine}
                aria-label={`Fjern linje ${route.from} til ${route.to}`}
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="admin-primary"
        type="button"
        disabled={routes.length === 0 || editingLine || !scenarioName.trim()}
        onClick={onNext}
      >
        Næste: bemanding
      </button>
    </aside>
  );
}
