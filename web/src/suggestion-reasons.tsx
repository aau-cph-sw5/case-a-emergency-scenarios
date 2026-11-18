import type { TrackSegment } from "../../shared/types/v1/scenario-list";

// Why a scenario was suggested (#357). The suggestion API returns only
// scenarioId and score, but the ranking searches the covered track segments
// and their station names (#355). So the operator is shown what the scenario
// covers and which of those stations their description mentions. Both come
// from the scenario list the client already has, with no change to the contract.

// Lower case, with Danish letters folded, so "norreport" finds "Nørreport".
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Station names are stored in lower case ("nørreport"); show them as names.
function displayName(name: string): string {
  return name.replace(
    /(^|[\s-])(\p{L})/gu,
    (_, gap, letter: string) => `${gap}${letter.toUpperCase()}`,
  );
}

// A station counts as mentioned when its whole name is in the description,
// or a typed word of four or more letters starts one of its words ("fasan"
// finds Fasanvej). Four letters keeps short words like "ved" from matching.
export function matchedStations(
  description: string,
  covers: readonly TrackSegment[] | undefined,
): string[] {
  const typed = fold(description);
  const words = typed.split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
  const stations = new Set(
    (covers ?? []).flatMap((segment) => [segment.stationA, segment.stationB]),
  );
  return [...stations]
    .filter((name) => {
      const folded = fold(name);
      return (
        typed.includes(folded) ||
        folded
          .split(/\s+/)
          .some((part) => words.some((word) => part.startsWith(word)))
      );
    })
    .map(displayName);
}

// The scenario's route in one line for the list: "Vanløse ↔ Fasanvej".
// Covered segments join into a chain; its two ends are the stations that
// appear in only one segment. A branching or looping scenario has no two
// clear ends, so it shows its first stretch and how many more there are.
export function routeLabel(
  covers: readonly TrackSegment[] | undefined,
): string {
  const pairs = new Map<string, [string, string]>();
  for (const { stationA, stationB } of covers ?? []) {
    pairs.set([stationA, stationB].sort().join("|"), [stationA, stationB]);
  }
  if (pairs.size === 0) return "";
  const count = new Map<string, number>();
  for (const [a, b] of pairs.values()) {
    count.set(a, (count.get(a) ?? 0) + 1);
    count.set(b, (count.get(b) ?? 0) + 1);
  }
  // Sorted, so the same scenario always reads the same way.
  const ends = [...count]
    .filter(([, n]) => n === 1)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b, "da"));
  if (ends.length === 2) return ends.map(displayName).join(" ↔ ");
  const [a, b] = [...pairs.values()][0];
  const more = pairs.size - 1;
  return `${displayName(a)} ↔ ${displayName(b)}${more > 0 ? ` og ${more} flere` : ""}`;
}
