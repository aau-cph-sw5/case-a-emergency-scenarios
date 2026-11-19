import type { LineGroup } from "../../shared/auth/line-groups.js";
import type { ScenarioList } from "../../shared/types/v1/scenario-list.js";
import { getStations } from "../repositories/network-repository.js";
import { getAllScenarios } from "../repositories/scenario-repository.js";
import { BM25Ranker } from "./scenario-suggestion/bm25ranker.js";
import {
  suggestScenarios,
  type ScenarioSuggestion,
} from "./scenario-suggestion/confidence.js";
import {
  createDanishTokenize,
  type Station,
} from "./scenario-suggestion/danish-tokenize.js";
import { toDocument } from "./scenario-suggestion/to-document.js";
import type { ScenarioDocument } from "./scenario-suggestion/types.js";

// Where the scenarios and stations come from: the database, unless a test passes its own.
const database = { getAllScenarios, getStations };

// Ranks the scenarios in the operator's line group against the description,
// and returns a shortlist or tells the operator that none fits (MET-A-019).
export async function suggestForOperator(
  lineGroup: LineGroup,
  description: string,
  sources = database,
): Promise<ScenarioSuggestion> {
  const [scenarios, stations] = await Promise.all([
    sources.getAllScenarios(lineGroup),
    sources.getStations(),
  ]);
  const docs = buildDocuments(scenarios, stations);
  const ranker = new BM25Ranker(createDanishTokenize(stations));
  return suggestScenarios(description, docs, { ranker });
}

// The stored scenario list gives the covered stations by name, while
// toDocument takes codes and the names separately. A station is looked up by
// code or by name, so this works whichever the list gives. A station that
// isn't in the station list is kept as it is, without a name.
export function buildDocuments(
  scenarios: ScenarioList,
  stations: readonly Station[],
): ScenarioDocument[] {
  const byCodeOrName = new Map<string, Station>();
  for (const station of stations) {
    byCodeOrName.set(station.code, station);
    byCodeOrName.set(station.name, station);
  }

  return scenarios.map((scenario) => {
    const covers = scenario.covers.map((segment) => ({
      ...segment,
      stationA: byCodeOrName.get(segment.stationA)?.code ?? segment.stationA,
      stationB: byCodeOrName.get(segment.stationB)?.code ?? segment.stationB,
    }));
    const names = scenario.covers.flatMap((segment) =>
      [segment.stationA, segment.stationB].flatMap(
        (key) => byCodeOrName.get(key)?.name ?? [],
      ),
    );
    return toDocument({ ...scenario, covers }, names);
  });
}
