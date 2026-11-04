import ScenarioStationList from "../../../shared/components/stationView";
import type { useScenario } from "../data/useScenario";

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
    <section
      className="scenario-preview"
      aria-labelledby="scenario-preview-heading"
    >
      <h2 id="scenario-preview-heading">Påvirkede stationer</h2>
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
      {scenario !== null && (
        <>
          <h3>{scenario.name}</h3>
          <p>Bemandingskrav · scenariet er ikke aktiveret</p>
          <ScenarioStationList scenario={scenario} mode="needed-only" />
        </>
      )}
    </section>
  );
}
