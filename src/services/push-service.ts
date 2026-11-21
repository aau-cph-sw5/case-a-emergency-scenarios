import {
  applicationDefault,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import { authSessionRepository } from "../repositories/auth-session-repository.js";
import { findScenario } from "../repositories/scenario-repository.js";

// ADR 0014: a phone offline for longer than this gets no alert, and only the
// newest scenario message per line group waits for it.
const TTL_MS = 60 * 60 * 1000;
export const SCENARIO_CHANNEL_ID = "scenarios";

// FCM's answers for a token no phone will ever accept again
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export function scenarioMessage(
  tokens: string[],
  lineGroup: LineGroup,
  started: boolean,
  scenarioName: string,
): MulticastMessage {
  return {
    tokens,
    notification: {
      title: started ? "Scenarie startet" : "Scenarie afsluttet",
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

let firebaseApp: App | null | undefined;

// Without credentials (tests, local development) nothing is sent.
function firebase(): App | null {
  if (firebaseApp === undefined) {
    firebaseApp = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? initializeApp({ credential: applicationDefault() })
      : null;
    if (!firebaseApp) {
      console.warn(
        "GOOGLE_APPLICATION_CREDENTIALS not set; push notifications are not sent",
      );
    }
  }
  return firebaseApp;
}

// Never throws: a failed push must not fail the activation (ADR 0014).
export async function notifyScenarioChange(
  lineGroup: LineGroup,
  started: boolean,
  scenarioId: string,
): Promise<void> {
  const app = firebase();
  if (!app) return;
  try {
    const scenarioName = (await findScenario(scenarioId))?.name ?? scenarioId;
    // shortcut: FCM takes at most 500 tokens per call, far above the stewards in one line group
    const tokens = await authSessionRepository.findStewardPushTokens(lineGroup);
    if (tokens.length === 0) return;
    const result = await getMessaging(app).sendEachForMulticast(
      scenarioMessage(tokens, lineGroup, started, scenarioName),
    );
    const deadTokens = tokens.filter((_, index) =>
      DEAD_TOKEN_CODES.has(result.responses[index].error?.code ?? ""),
    );
    await authSessionRepository.clearPushTokens(deadTokens);
  } catch (error) {
    console.error("Push notification failed:", error);
  }
}
