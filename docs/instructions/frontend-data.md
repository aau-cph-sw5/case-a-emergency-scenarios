# Frontend data

The control-room web app gets all its server data from `web/src/data/`. A UI
component reads data through the hooks below and never calls `fetch`, a
`fetch…` function or `socket.on` itself. What each field means is written as a
comment on the hook in the code.

## How to

### Read the active scenarios with `useLiveData()`

```tsx
import { useLiveData } from "../data/liveData";

const { activations, scenarios, isConnected, isLoading, error } =
  useLiveData();
```

`useLiveData()` works in every component inside `<LiveDataProvider>`, which
`web/src/App.tsx` puts around the banner and the dashboard. Your component
needs no token and no socket.

The scenario list is loaded once per login. When that load fails,
`scenariosError` holds the message and `reloadScenarios()` loads the list
again, so a component can offer the operator a "try again" button.

### Read one scenario definition with `useScenario(scenarioId)`

```tsx
import { useScenario } from "../data/useScenario";

const { scenario, isLoading, error } = useScenario(selectedId);
```

Pass `null` when nothing is selected.

### Read the metro network with `useNetwork(token)`

The web map uses `useNetwork(token)` from `web/src/data/useNetwork.ts` to load
stations, schematic positions, track segments and normal patterns from
`GET /api/v1/network`. The hook returns `network`, `error` and `retry`. Scenario
data still supplies the selected operating pattern and station requirements.

The mobile steward view loads the same network and saves a usable copy for
offline use. If the server is unavailable it uses the cached network. Without
a cached copy, the map is unavailable until the device can fetch a complete
network. Mobile
rejects incomplete network responses to preserve a usable offline map, while web
displays the partial network with a warning. Crossovers are not loaded by this
endpoint.

### Derive scenario map lines with `shared/scenario/map-lines.ts`

Web and mobile derive map lines from a scenario through
`shared/scenario/map-lines.ts`. Using one module keeps routes and closed
stretches aligned across both clients. The file has no `react-native` or
`Theme` imports, so Node unit tests import it directly.

- `scenarioLines(scenario, groupLines, segments)` resolves the current
  version's operating patterns for the selected line group. It skips blank
  destination IDs, sorts patterns numerically by destination ID, and expands
  `trackNumber: 12` to tracks 1 and 2. It returns `{ lines, closedLine, missingRoutes }`.
  When `groupLines` does not match `scenario.lineGroup`, it returns empty
  `lines`, `closedLine: null`, and `missingRoutes: false`.
- `closedStretchLine(covers, running)` collects covered track segments that no
  running route draws on the same track. It builds one map line with name
  `CLOSED_LINE`, whose value is `"Spærret"`, or returns `null` when no covered
  track remains undrawn.
- `routeColor(route, lines, fallbackColor)` returns the colour of the single
  Metro line that contains every connection in `route`. It returns
  `fallbackColor` when `route` has no connections, matches zero or multiple
  lines, or matches a line without a colour.

`shared/scenario/affected-stations.ts` provides two helpers that
`shared/scenario/map-lines.ts` builds on:

- `coversAsMapLine(name, covers)` groups covered track segments into unique
  station pairs with per-pair `connectionTracks` metadata.
- `samePiece(pairA, pairB)` checks whether two station pairs represent the same
  track piece regardless of direction.

## What things mean

| Issue | Hook | Fields |
|---|---|---|
| #182 Scenario list | `useLiveData()` | `scenarios`, `scenariosError` and `reloadScenarios`, and `activations` to mark the active ones |
| #183 Metro map | `useNetwork(token)` and `useScenario(selectedId)` | Network positions and connections, plus the current scenario version |
| #184 Station coverage | `useLiveData()` and `useScenario(activation.scenarioId)` | `activations[].deployments`, and `stationRequirements` with `minimumStaffing` |
| #185 Status bar | `useLiveData()` | `activations`, `scenarios` for the name, `isConnected`, `lastUpdatedAt` |
| #201 Steward positions | `useLiveData()` | `activations[].deployments`, `isConnected`, `error` |
| #202 Scenario preview | `useScenario(selectedId)` | `stationRequirements` of the current version |
| Active-scenario banner | `useLiveData()` | `activations`, `scenarios` for the name |
