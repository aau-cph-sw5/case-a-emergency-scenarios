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
offline use. If the server is unavailable it uses the cached network; without a
cached copy it falls back to the bundled map. Crossovers are not loaded by this
endpoint.

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
