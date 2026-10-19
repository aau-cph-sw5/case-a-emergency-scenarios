// Case-insensitive name match. An empty or blank query keeps every scenario.
export function filterScenarios<T extends { name: string }>(
  scenarios: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return scenarios;
  }
  return scenarios.filter((scenario) =>
    scenario.name.toLowerCase().includes(needle),
  );
}
