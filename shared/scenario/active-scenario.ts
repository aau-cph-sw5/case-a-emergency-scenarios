// No react-native imports here, so the unit tests can import this file.
// The one place the steward app fetches the active scenario (#157), so the
// offline copy (MET-A-005) can wrap it.
import { getJson } from "../api/http";

// contracts/v1/scenario-state.schema.json
export type Deployment = {
  status: "UNMANNED" | "PENDING" | "MANNED";
  reportedAt?: string | null;
  arrivedAt?: string | null;
  staff?: string | null;
  fulfills: string;
};

export type ScenarioState = {
  activationId: string;
  scenarioId: string;
  startedAt: string;
  endedAt?: string | null;
  status: "ACTIVE" | "CLOSED";
  actor: string;
  deployments: Deployment[];
};

// The fields of contracts/v1/scenario.schema.json the steward app uses.
export type TrackSegment = {
  trackNumber: number;
  stationA: string;
  stationB: string;
};

export type StationRequirement = {
  station: string;
  placement: string;
  minimumStaffing: number;
  activeDuring?: { dayPattern: string; startTime: string; endTime: string }[];
  actions?: { sequence: number; instruction: string }[];
};

export type ScenarioVersion = {
  version: string;
  stationRequirements: StationRequirement[];
  passengerInformation?: unknown[];
};

export type ScenarioDefinition = {
  scenarioId: string;
  name: string;
  currentVersion: string;
  covers?: TrackSegment[];
  versions: ScenarioVersion[];
};

export type ActiveScenario =
  | { active: false }
  | { active: true; state: ScenarioState; scenario: ScenarioDefinition };

function isDeployment(data: unknown): data is Deployment {
  if (typeof data !== "object" || data === null) return false;
  const { status, fulfills } = data as Record<string, unknown>;
  return (
    (status === "UNMANNED" || status === "PENDING" || status === "MANNED") &&
    typeof fulfills === "string"
  );
}

export function isScenarioState(data: unknown): data is ScenarioState {
  if (typeof data !== "object" || data === null) return false;
  const state = data as Record<string, unknown>;
  return (
    typeof state.activationId === "string" &&
    typeof state.scenarioId === "string" &&
    typeof state.startedAt === "string" &&
    (state.status === "ACTIVE" || state.status === "CLOSED") &&
    typeof state.actor === "string" &&
    Array.isArray(state.deployments) &&
    state.deployments.every(isDeployment)
  );
}

const isObject = (data: unknown): data is Record<string, unknown> =>
  typeof data === "object" && data !== null;

// Checked down to the fields the steward view renders, so a malformed entry
// is refused here instead of being saved and crashing the view.
function isStationRequirement(data: unknown): data is StationRequirement {
  if (!isObject(data)) return false;
  const { station, placement, minimumStaffing, activeDuring, actions } = data;
  return (
    typeof station === "string" &&
    typeof placement === "string" &&
    typeof minimumStaffing === "number" &&
    (activeDuring === undefined ||
      (Array.isArray(activeDuring) &&
        activeDuring.every(
          (window) =>
            isObject(window) &&
            typeof window.dayPattern === "string" &&
            typeof window.startTime === "string" &&
            typeof window.endTime === "string",
        ))) &&
    (actions === undefined ||
      (Array.isArray(actions) &&
        actions.every(
          (action) =>
            isObject(action) &&
            typeof action.sequence === "number" &&
            typeof action.instruction === "string",
        )))
  );
}

function isScenarioVersion(data: unknown): data is ScenarioVersion {
  if (!isObject(data)) return false;
  return (
    typeof data.version === "string" &&
    Array.isArray(data.stationRequirements) &&
    data.stationRequirements.every(isStationRequirement)
  );
}

export function isScenarioDefinition(
  data: unknown,
): data is ScenarioDefinition {
  if (!isObject(data)) return false;
  return (
    typeof data.scenarioId === "string" &&
    typeof data.name === "string" &&
    typeof data.currentVersion === "string" &&
    Array.isArray(data.versions) &&
    data.versions.every(isScenarioVersion)
  );
}

// Fetches the active scenario state and, only if a scenario is active, its
// definition. No crisis means nothing more is fetched.
export async function loadActiveScenario(
  apiBaseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ActiveScenario> {
  const state = await getJson(
    apiBaseUrl,
    "/api/v1/scenario-state",
    token,
    isScenarioState,
    fetchImpl,
  );
  if (state.status !== "ACTIVE") {
    return { active: false };
  }
  const scenario = await getJson(
    apiBaseUrl,
    `/api/v1/scenarios/${encodeURIComponent(state.scenarioId)}`,
    token,
    isScenarioDefinition,
    fetchImpl,
  );
  return { active: true, state, scenario };
}
