const scenarioNameOrder = new Intl.Collator("da", {
  numeric: true,
  sensitivity: "base",
});

// Filter by name or by a station the scenario covers, and display them in
// natural order: scenario 1, 2, ... 10. Operators often know the station
// before the scenario's name (#357). filter creates a new array, so sorting
// never changes the shared live data.
export function filterScenarios<
  T extends {
    name: string;
    covers?: readonly { stationA: string; stationB: string }[];
  },
>(scenarios: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  return scenarios
    .filter(
      (scenario) =>
        scenario.name.toLowerCase().includes(needle) ||
        (scenario.covers ?? []).some(
          (segment) =>
            segment.stationA.toLowerCase().includes(needle) ||
            segment.stationB.toLowerCase().includes(needle),
        ),
    )
    .sort((a, b) => scenarioNameOrder.compare(a.name, b.name));
}
