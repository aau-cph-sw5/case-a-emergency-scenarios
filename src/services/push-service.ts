import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import { STATION_CHANNEL_ID, SCENARIO_CHANNEL_ID } from "../../shared/push-channels.js";
import { authSessionRepository } from "../repositories/auth-session-repository.js";
import { findScenario } from "../repositories/scenario-repository.js";

// ADR 0014: a phone offline for longer than this gets no alert, and only the
// newest scenario message per line group waits for it.
const TTL_MS = 60 * 60 * 1000;
export const SCENARIO_CHANNEL_ID = "scenarios";


export type ScenarioChange = "started" | "ended";

// FCM's answers for a token no phone will ever accept again
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "messaging/mismatched-credential",
]);

export function scenarioMessage(
  tokens: string[],
  lineGroup: LineGroup,
  change: ScenarioChange,
  scenarioName: string,
): MulticastMessage {
  return {
    tokens,
    notification: {
      title: change === "started" ? "Scenarie startet" : "Scenarie afsluttet",
      body: scenarioName,
    },
    android: {
      priority: "high",
      ttl: TTL_MS,
      collapseKey: `scenario-${lineGroup}`,
      notification: { channelId: SCENARIO_CHANNEL_ID },
    },
  };
}
export function stationMessage(
  tokens: string[],
  station: string,
): MulticastMessage {
  return {
    tokens,
    notification: {
      title: "Stationsmeddelelse",
      body: station,
    },
    android: {
      priority: "high",
      ttl: TTL_MS,
      notification: { channelId: STATION_CHANNEL_ID },
    },
  };
}

let warnedNoCredentials = false;

// Without credentials (tests, local development) nothing is sent.
function firebase(): App | null {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (!warnedNoCredentials) {
      console.warn(
        "GOOGLE_APPLICATION_CREDENTIALS not set; push notifications are not sent",
      );
      warnedNoCredentials = true;
    }
    return null;
  }
  return getApps()[0] ?? initializeApp({ credential: applicationDefault() });
}

const lineGroupQueues = new Map<LineGroup, Promise<void>>();

// Runs a line group's tasks one at a time, in the order they were queued.
// Scenario pushes share a collapse key, so an "ended" sent late would
// otherwise replace a newer "started" on an offline phone.
export function inLineGroupOrder(
  lineGroup: LineGroup,
  task: () => Promise<void>,
): Promise<void> {
  const next = (lineGroupQueues.get(lineGroup) ?? Promise.resolve()).then(task);
  lineGroupQueues.set(lineGroup, next);
  return next;
}

// Never rejects: a failed push must not fail the activation (ADR 0014).
export function notifyScenarioChange(
  lineGroup: LineGroup,
  change: ScenarioChange,
  scenarioId: string,
): Promise<void> {
  return inLineGroupOrder(lineGroup, () =>
    sendScenarioChange(lineGroup, change, scenarioId),
  );
}

async function sendScenarioChange(
  lineGroup: LineGroup,
  change: ScenarioChange,
  scenarioId: string,
): Promise<void> {
  try {
    const app = firebase();
    if (!app) return;
    const scenarioName = (await findScenario(scenarioId))?.name ?? scenarioId;
    // shortcut: FCM takes at most 500 tokens per call, far above the stewards in one line group
    const tokens = await authSessionRepository.findStewardPushTokens(lineGroup);
    if (tokens.length === 0) return;
    const result = await getMessaging(app).sendEachForMulticast(
      scenarioMessage(tokens, lineGroup, change, scenarioName),
    );
    const deadTokens: string[] = [];
    result.responses.forEach(({ error }, index) => {
      if (!error) return;
      if (DEAD_TOKEN_CODES.has(error.code)) deadTokens.push(tokens[index]);
      else
        console.error("Push notification failed:", error.code, error.message);
    });
    await authSessionRepository.clearPushTokens(deadTokens);
  } catch (error) {
    console.error("Push notification failed:", error);
  }
}
export async function notifyStationMessage(
activationId: number,
station: string,
senderId: number | null,
): Promise<void> {
  const app = firebase();
  try {
    const app = firebase();
    if (!app) return;
    const tokens = await authSessionRepository.findStationStewardPushTokens(
      activationId,
      station,
      senderId,
    );
    if (tokens.length === 0) return;
    const result = await getMessaging(app).sendEachForMulticast(
      stationMessage(tokens, station),
    );
    const deadTokens: string[] = [];
    result.responses.forEach(({ error }, index) => {
      if (!error) return;
      if (DEAD_TOKEN_CODES.has(error.code)) deadTokens.push(tokens[index]);
      else
        console.error("Push notification failed:", error.code, error.message);
    });
    await authSessionRepository.clearPushTokens(deadTokens);
  } catch (error) {
    console.error("Push notification failed:", error);
  }
}