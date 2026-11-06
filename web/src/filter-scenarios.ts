const scenarioNameOrder = new Intl.Collator("da", {
  numeric: true,
  sensitivity: "base",
});

// Filter names and display them in natural order: scenario 1, 2, ... 10.
// filter creates a new array, so sorting never changes the shared live data.
export function filterScenarios<T extends { name: string }>(
  scenarios: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  return scenarios
    .filter((scenario) => scenario.name.toLowerCase().includes(needle))
    .sort((a, b) => scenarioNameOrder.compare(a.name, b.name));
}
