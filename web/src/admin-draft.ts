type LineGroup = "M1/M2" | "M3/M4";
type Route = {
  id: number;
  from: string;
  to: string;
  type: "PENDULUM" | "ROUNDTRIP";
  track: 1 | 2 | 12;
  did: string;
  color: string;
  maximumTrains: number;
  stations: string[];
  stops?: string[];
};
type StationStaffing = {
  station: string;
  placement: string;
  minimumStaffing: number;
  tasks: { id: number; instruction: string }[];
  windows?: {
    id: number;
    dayPattern: string;
    startTime: string;
    endTime: string;
  }[];
};

export type ScenarioDraft = {
  lineGroup: LineGroup;
  view: "editor" | "staffing";
  editingLine: boolean;
  editingRouteId?: number | null;
  scenarioId: string;
  scenarioName: string;
  routes: Route[];
  selectedStops?: string[];
  staffing: StationStaffing[];
  from: string;
  to: string;
  manualType: "PENDULUM" | "ROUNDTRIP" | null;
  track: 1 | 2;
  lineColor: string;
  did: string;
  maximumTrains: string;
  pathIndex: number;
};

function draftKey(token: string): string | null {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload: unknown = JSON.parse(atob(encoded));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("userId" in payload)
    )
      return null;
    const { userId } = payload;
    return typeof userId === "number" &&
      Number.isSafeInteger(userId) &&
      userId > 0
      ? `metro-scenario-draft-v1:${userId}`
      : null;
  } catch {
    return null;
  }
}

function validDraft(value: unknown): value is ScenarioDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  const routes = draft.routes;
  const staffing = draft.staffing;
  return (
    (draft.lineGroup === "M1/M2" || draft.lineGroup === "M3/M4") &&
    (draft.view === "editor" || draft.view === "staffing") &&
    typeof draft.editingLine === "boolean" &&
    (draft.editingRouteId === undefined ||
      draft.editingRouteId === null ||
      (Number.isSafeInteger(draft.editingRouteId) &&
        (draft.editingRouteId as number) >= 0)) &&
    [
      draft.scenarioId,
      draft.scenarioName,
      draft.from,
      draft.to,
      draft.lineColor,
      draft.did,
      draft.maximumTrains,
    ].every((item) => typeof item === "string") &&
    (draft.manualType === null ||
      draft.manualType === "PENDULUM" ||
      draft.manualType === "ROUNDTRIP") &&
    (draft.track === 1 || draft.track === 2) &&
    Number.isSafeInteger(draft.pathIndex) &&
    (draft.pathIndex as number) >= 0 &&
    (draft.selectedStops === undefined ||
      (Array.isArray(draft.selectedStops) &&
        draft.selectedStops.every(
          (station: unknown) => typeof station === "string",
        ))) &&
    Array.isArray(routes) &&
    routes.every(
      (route) =>
        route &&
        Number.isSafeInteger(route.id) &&
        route.id >= 0 &&
        typeof route.from === "string" &&
        typeof route.to === "string" &&
        (route.type === "PENDULUM" || route.type === "ROUNDTRIP") &&
        [1, 2, 12].includes(route.track) &&
        typeof route.did === "string" &&
        typeof route.color === "string" &&
        /^#[0-9A-Fa-f]{6}$/.test(route.color) &&
        Number.isSafeInteger(route.maximumTrains) &&
        route.maximumTrains >= 0 &&
        (route.stops === undefined ||
          (Array.isArray(route.stops) &&
            route.stops.every(
              (station: unknown) => typeof station === "string",
            ))) &&
        Array.isArray(route.stations) &&
        route.stations.every((station: unknown) => typeof station === "string"),
    ) &&
    Array.isArray(staffing) &&
    staffing.every(
      (item) =>
        item &&
        typeof item.station === "string" &&
        typeof item.placement === "string" &&
        Number.isSafeInteger(item.minimumStaffing) &&
        item.minimumStaffing >= 1 &&
        (item.windows === undefined ||
          (Array.isArray(item.windows) &&
            item.windows.every(
              (window: {
                id?: unknown;
                dayPattern?: unknown;
                startTime?: unknown;
                endTime?: unknown;
              }) =>
                window &&
                Number.isSafeInteger(window.id) &&
                typeof window.dayPattern === "string" &&
                typeof window.startTime === "string" &&
                typeof window.endTime === "string",
            ))) &&
        Array.isArray(item.tasks) &&
        item.tasks.every(
          (task: { id?: unknown; instruction?: unknown }) =>
            task &&
            Number.isSafeInteger(task.id) &&
            typeof task.instruction === "string",
        ),
    )
  );
}

export function readScenarioDraft(token: string): ScenarioDraft | null {
  try {
    const key = draftKey(token);
    const raw = key && window.sessionStorage.getItem(key);
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    return validDraft(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function writeScenarioDraft(
  token: string,
  draft: ScenarioDraft,
): boolean {
  try {
    const key = draftKey(token);
    if (!key) return false;
    window.sessionStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearScenarioDraft(token: string): void {
  try {
    const key = draftKey(token);
    if (key) window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable; saving the scenario must still succeed.
  }
}
