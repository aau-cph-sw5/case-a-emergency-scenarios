// No react-native imports here, so the unit tests can import this file.
// The steward's offline copy of the active scenario (MET-A-005). See
// docs/adr/0008-offline-copy-of-the-active-scenario.md.
import { currentVersionOf } from "../ScenarioParser";
import {
  isScenarioDefinition,
  isScenarioState,
  type ActiveScenario,
  type ScenarioDefinition,
  type ScenarioState,
  type ScenarioVersion,
} from "../scenario/active-scenario";

// Placeholder until Metro answers how long a local copy can be trusted
// (open question on MET-A-005). Change it here only.
export const STALE_AFTER_MS = 60 * 60 * 1000;

const STORAGE_KEY = "met-a-005/active-scenario";

export type ScenarioSnapshot = {
  savedAt: string;
  userId: string;
  state: ScenarioState;
  scenario: ScenarioDefinition;
};

// The same shape as AsyncStorage, so the app can pass it in directly and the
// tests can pass an in-memory fake.
export type SnapshotStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// Keeps only what the steward reads: the activation and the scenario's
// current version without its operating plan. One snapshot at a time.
export function buildSnapshot(
  active: Extract<ActiveScenario, { active: true }>,
  userId: string,
  now: Date,
): ScenarioSnapshot {
  const { scenario } = active;
  const current = currentVersionOf(scenario) as ScenarioVersion | undefined;
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
              stationRequirements: current.stationRequirements ?? [],
              passengerInformation: current.passengerInformation ?? [],
            },
          ]
        : [],
    },
  };
}

function isSnapshot(data: unknown): data is ScenarioSnapshot {
  if (typeof data !== "object" || data === null) return false;
  const snapshot = data as Record<string, unknown>;
  return (
    typeof snapshot.savedAt === "string" &&
    !Number.isNaN(Date.parse(snapshot.savedAt)) &&
    typeof snapshot.userId === "string" &&
    isScenarioState(snapshot.state) &&
    isScenarioDefinition(snapshot.scenario)
  );
}

export function createSnapshotStore(storage: SnapshotStorage) {
  return {
    save(snapshot: ScenarioSnapshot): Promise<void> {
      return storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    },

    // With a userId, another steward's copy counts as no copy. Without one
    // (the app opened offline, before login) the last copy is returned.
    async load(userId?: string): Promise<ScenarioSnapshot | null> {
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return null;
      }
      if (!isSnapshot(data)) return null;
      if (userId !== undefined && data.userId !== userId) return null;
      return data;
    },

    clear(): Promise<void> {
      return storage.removeItem(STORAGE_KEY);
    },
  };
}

export function ageInMinutes(savedAt: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(savedAt)) / 60_000);
}

export function isStale(savedAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(savedAt) > STALE_AFTER_MS;
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
