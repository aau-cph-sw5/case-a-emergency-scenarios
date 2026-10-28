// No react-native imports here, so the unit tests can import this file.
// The steward's offline copy of the active scenario (MET-A-005). See
// docs/adr/0010-offline-copy-of-the-active-scenario.md.
import {
  isPassengerInformation,
  isScenarioState,
  isStationRequirement,
  type ActiveScenario,
  type ScenarioDefinition,
  type ScenarioState,
  type ScenarioVersion,
} from "../scenario/active-scenario";

// Placeholder until Metro answers how long a local copy can be trusted
// (open question on MET-A-005). Change it here only.
export const STALE_AFTER_MS = 60 * 60 * 1000;

export const STORAGE_KEY = "metro-active-scenario-copy";

// The scenario as the copy keeps it: only the current version, without its
// revision and operating plan.
export type SnapshotVersion = Pick<
  ScenarioVersion,
  "version" | "stationRequirements" | "passengerInformation"
>;
export type SnapshotScenario = Pick<
  ScenarioDefinition,
  "scenarioId" | "name" | "currentVersion" | "covers"
> & { versions: SnapshotVersion[] };

export type ScenarioSnapshot = {
  savedAt: string;
  userId: string;
  state: ScenarioState;
  scenario: SnapshotScenario;
};

// The same shape as AsyncStorage, so the app can pass it in directly and the
// tests can pass an in-memory fake.
export type SnapshotStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SnapshotStore = ReturnType<typeof createSnapshotStore>;

// Keeps only what the steward reads: the activation and the scenario's
// current version without its operating plan. One snapshot at a time.
export function buildSnapshot(
  active: Extract<ActiveScenario, { active: true }>,
  userId: string,
  now: Date,
): ScenarioSnapshot {
  const { scenario } = active;
  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );
  return {
    savedAt: now.toISOString(),
    userId,
    state: active.state,
    scenario: {
      scenarioId: scenario.scenarioId,
      name: scenario.name,
      currentVersion: scenario.currentVersion,
      covers: scenario.covers ?? [],
      versions: current
        ? [
            {
              version: current.version,
              stationRequirements: current.stationRequirements,
              passengerInformation: current.passengerInformation ?? [],
            },
          ]
        : [],
    },
  };
}

const isObject = (data: unknown): data is Record<string, unknown> =>
  typeof data === "object" && data !== null;

function isSnapshotScenario(data: unknown): data is SnapshotScenario {
  if (!isObject(data)) return false;
  return (
    typeof data.scenarioId === "string" &&
    typeof data.name === "string" &&
    typeof data.currentVersion === "string" &&
    Array.isArray(data.covers) &&
    data.covers.every(
      (segment) =>
        isObject(segment) &&
        typeof segment.stationA === "string" &&
        typeof segment.stationB === "string",
    ) &&
    Array.isArray(data.versions) &&
    data.versions.every(
      (version) =>
        isObject(version) &&
        typeof version.version === "string" &&
        Array.isArray(version.stationRequirements) &&
        version.stationRequirements.every(isStationRequirement) &&
        (version.passengerInformation === undefined ||
          (Array.isArray(version.passengerInformation) &&
            version.passengerInformation.every(isPassengerInformation))),
    )
  );
}

function isSnapshot(data: unknown): data is ScenarioSnapshot {
  if (!isObject(data)) return false;
  return (
    typeof data.savedAt === "string" &&
    !Number.isNaN(Date.parse(data.savedAt)) &&
    typeof data.userId === "string" &&
    isScenarioState(data.state) &&
    isSnapshotScenario(data.scenario)
  );
}

export function createSnapshotStore(storage: SnapshotStorage) {
  return {
    save(snapshot: ScenarioSnapshot): Promise<void> {
      return storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    },

    // Another steward's copy, or a damaged one, counts as no copy.
    async load(userId: string): Promise<ScenarioSnapshot | null> {
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return null;
      }
      if (!isSnapshot(data) || data.userId !== userId) return null;
      return data;
    },

    clear(): Promise<void> {
      return storage.removeItem(STORAGE_KEY);
    },
  };
}

// How far in the future a copy may be saved before its age counts as
// unknown. Absorbs small clock adjustments, such as a network time sync.
export const CLOCK_TOLERANCE_MS = 2 * 60 * 1000;

// Null when the copy was saved further in the future than the tolerance: the
// phone's clock has been turned back since, so the age cannot be known.
export function ageInMinutes(savedAt: string, now: Date): number | null {
  const age = now.getTime() - Date.parse(savedAt);
  if (age < -CLOCK_TOLERANCE_MS) return null;
  return Math.max(0, Math.floor(age / 60_000));
}

// A copy of unknown age is stale, so it never passes for a fresh one.
export function isStale(savedAt: string, now: Date): boolean {
  const age = now.getTime() - Date.parse(savedAt);
  return age > STALE_AFTER_MS || age < -CLOCK_TOLERANCE_MS;
}

const pad = (value: number) => String(value).padStart(2, "0");

// "HH:MM" in the phone's local time, or "DD/MM HH:MM" when the copy is not
// from today, so an old copy cannot pass for today's.
export function formatSyncTime(savedAt: string, now: Date): string {
  const date = new Date(savedAt);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.toDateString() === now.toDateString()
    ? time
    : `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${time}`;
}
