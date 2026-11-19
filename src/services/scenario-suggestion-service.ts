import type { ScenarioList } from "../../shared/types/v1/scenario-list.js";
import type { Station } from "./scenario-suggestion/danish-tokenize.js";
import { toDocument } from "./scenario-suggestion/to-document.js";
import type { ScenarioDocument } from "./scenario-suggestion/types.js";

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
