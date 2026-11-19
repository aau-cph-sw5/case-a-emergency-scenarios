import { useState } from "react";
import type { Scenario } from "../../../shared/types/v1/scenario";
import type { useScenario } from "../data/useScenario";
import { routeLabel } from "../suggestion-reasons";
import { STATION_RANK } from "../../../shared/components/stationView";

const rank = (station: string) =>
  STATION_RANK.get(station) ?? Number.MAX_SAFE_INTEGER;

type Requirement = Scenario["versions"][number]["stationRequirements"][number];

// Right-column preview of the selected scenario (guide 04: Status, Begrundelse).
// "Nødvendige stewards: N" stays one string for screen readers and tests.
export function ScenarioPreview({
  scenarioId,
  preview,
}: {
  scenarioId: string | null;
  preview: ReturnType<typeof useScenario>;
}) {
  // The shared loader also serves live coverage and the future map (#183).
  // useScenario ignores answers for a selection the operator has left.
  const { scenario, isLoading, error, retry } = preview;

  return (
    <section className="scenario-preview" aria-label="Scenariepreview">
      {scenarioId === null && (
        <p role="status">Vælg et scenarie for at se bemandingsbehov.</p>
      )}
      {isLoading && <p role="status">Henter scenarie…</p>}
      {error !== null && (
        <>
          <p role="alert">Kunne ikke hente scenariet: {error}</p>
          <button type="button" onClick={retry}>
            Prøv igen
          </button>
        </>
      )}
      {scenario !== null && <Details scenario={scenario} />}
    </section>
  );
}

// Name and counts first, then the route block and the station rows.
function Details({ scenario }: { scenario: Scenario }) {
  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion,
  );
  const stations = [...(version?.stationRequirements ?? [])].sort(
    (a, b) => rank(a.station) - rank(b.station),
  );
  const needed = stations.reduce((sum, r) => sum + r.minimumStaffing, 0);
  const route = routeLabel(scenario.covers);

  return (
    <>
      <h2 className="preview-title">{scenario.name}</h2>
      <dl className="preview-stats">
        <div>
          <dt>Påvirkede stationer: </dt>
          <dd>{stations.length}</dd>
        </div>
        <div>
          <dt>Nødvendige stewards: </dt>
          <dd>{needed}</dd>
        </div>
      </dl>

      {route !== "" && (
        <>
          <h3 className="preview-heading">Strækning</h3>
          <p className="preview-route">{route}</p>
        </>
      )}

      <h3 className="preview-heading preview-heading--stations">
        <span>Stationer</span>
        <span>Stewards nr.</span>
      </h3>
      {stations.length === 0 ? (
        <p>Scenariet kræver ingen stationer.</p>
      ) : (
        <ul className="preview-stations">
          {stations.map((r) => (
            <StationRow
              key={`${scenario.scenarioId}:${r.station}`}
              requirement={r}
            />
          ))}
        </ul>
      )}
    </>
  );
}

// One station as a row (square marker plus word, never colour alone); pressing
// it opens placement and the numbered tasks.
function StationRow({ requirement }: { requirement: Requirement }) {
  const [open, setOpen] = useState(false);
  const actions = [...(requirement.actions ?? [])].sort(
    (a, b) => a.sequence - b.sequence,
  );
  return (
    <li className={open ? "is-open" : undefined}>
      <button
        type="button"
        className="preview-station"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="preview-station-name">{requirement.station}</span>
        <span className="preview-station-need">
          <i aria-hidden="true" />
          Kræver: {requirement.minimumStaffing}
        </span>
      </button>
      {open && (
        <div className="preview-station-details">
          <p>Placering: {requirement.placement}</p>
          <h4>Opgaver</h4>
          {actions.length === 0 ? (
            <p>Ingen opgaver angivet.</p>
          ) : (
            <ol>
              {actions.map((action) => (
                <li key={action.sequence}>{action.instruction}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}
