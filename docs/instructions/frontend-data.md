# Frontend data

The control-room web app gets all its server data from `web/src/data/`. A UI
component reads data through one of two hooks and never calls `fetch`, a
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

### Read one scenario definition with `useScenario(scenarioId)`

```tsx
import { useScenario } from "../data/useScenario";

const { scenario, isLoading, error } = useScenario(selectedId);
```

Pass `null` when nothing is selected.

## What things mean

| Issue | Hook | Fields |
|---|---|---|
| #182 Scenario list | `useLiveData()` | `scenarios` and `scenariosError`, and `activations` to mark the active ones |
| #183 Metro map | `useScenario(selectedId)` | `stationRequirements` of the current version |
| #184 Station coverage | `useLiveData()` and `useScenario(activation.scenarioId)` | `activations[].deployments`, and `stationRequirements` with `minimumStaffing` |
| #185 Status bar | `useLiveData()` | `activations`, `scenarios` for the name, `isConnected`, `lastUpdatedAt` |
| #201 Steward positions | `useLiveData()` | `activations[].deployments`, `isConnected`, `error` |
| #202 Scenario preview | `useScenario(selectedId)` | `stationRequirements` of the current version |
| Active-scenario banner | `useLiveData()` | `activations`, `scenarios` for the name |
