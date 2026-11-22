import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request.js";
import { ERROR_CODES, type ErrorCode } from "../../shared/error-codes.js";
import { getDatabase, type Db } from "../db/client.js";
import {
  findActivation,
  findActiveActivation,
} from "../repositories/activation-repository.js";
import {
  findByClientMessageId,
  insertStationMessage,
  listMessages,
  lockActivationForMessage,
  lockClientMessageId,
  lockStationThread,
  lockStewardPosition,
  stationIsRequired,
  stewardIsCheckedIn,
} from "../repositories/station-message-repository.js";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import type { AuthUser } from "./auth-service.js";
import { appendStationMessageEvent } from "./incident-log-service.js";

type Refusal = { kind: "refused"; code: ErrorCode };

type ThreadView = {
  activationId: number;
  station: string;
  state: "UNANSWERED" | "ANSWERED";
  unansweredSince: string | null;
  lastMessageAt: string | null;
  stationMessageIds: number[];
  messages?: StationMessage[];
};

function makeThread(
  activationId: number,
  station: string,
  messages: StationMessage[],
  includeMessages: boolean,
): ThreadView {
  const last = messages[messages.length - 1];
  let lastControlRoomIndex = -1;

  // Find the latest reply from the control room.
  messages.forEach((message, index) => {
    if (message.sender === "CONTROL_ROOM") {
      lastControlRoomIndex = index;
    }
  });

  // If the station messages after the control room's last reply, show when that started.
  // Example: control room replies at 10:00, then the station messages at 10:05; unansweredSince is 10:05.
  const unansweredSince =
    last?.sender === "STATION"
      ? messages.find(
          (message, index) =>
            index > lastControlRoomIndex && message.sender === "STATION",
        )!.receivedAt
      : null;

  return {
    activationId,
    station,
    state: unansweredSince === null ? "ANSWERED" : "UNANSWERED",
    unansweredSince,
    lastMessageAt: last?.receivedAt ?? null,
    stationMessageIds: messages
      .filter((message) => message.sender === "STATION")
      .map((message) => message.id),
    ...(includeMessages ? { messages } : {}),
  };
}

async function validateActiveActivation(
  db: Db,
  user: AuthUser,
  activationId: number,
): Promise<
  | {
      kind: "ok";
      activation: NonNullable<Awaited<ReturnType<typeof findActivation>>>;
    }
  | Refusal
> {
  // A message can only belong to an active scenario in the user's line group.
  let activation = await findActivation(activationId, db);

  if (!activation || activation.lineGroup !== user.lineGroup) {
    const active = await findActiveActivation(user.lineGroup, db);
    return active
      ? { kind: "refused", code: ERROR_CODES.SCENARIO_STOOD_DOWN }
      : { kind: "refused", code: ERROR_CODES.NO_ACTIVE_SCENARIO };
  }

  await lockActivationForMessage(db, activationId);
  activation = await findActivation(activationId, db);

  if (!activation || activation.status !== "ACTIVE") {
    return { kind: "refused", code: ERROR_CODES.SCENARIO_STOOD_DOWN };
  }

  if (activation.lineGroup !== user.lineGroup) {
    return { kind: "refused", code: ERROR_CODES.SCENARIO_STOOD_DOWN };
  }

  return { kind: "ok", activation };
}

// A new message also carries what the live event needs (#334): the
// activation it belongs to and the thread's state after it, worked out in the
// same transaction, so the event matches what was stored.
export type CreatedStationMessage = {
  kind: "created";
  message: StationMessage;
  activation: { activationId: number; lineGroup: LineGroup };
  thread: Omit<ThreadView, "messages">;
};

export async function createStationMessage(
  user: AuthUser,
  station: string,
  request: StationMessageRequest,
): Promise<
  CreatedStationMessage | { kind: "repeat"; message: StationMessage } | Refusal
> {
  return getDatabase().begin(async (tx) => {
    // Keep using this client-generated ID for retries; ignore differences in letter case.
    const clientMessageId = request.clientMessageId.toLowerCase();
    await lockClientMessageId(tx, clientMessageId);

    const previous = await findByClientMessageId(tx, clientMessageId);
    if (previous) {
      // Check retries first so an already-saved message still succeeds after stand-down.
      const sameContent =
        previous.activationId === request.activationId &&
        previous.station === station &&
        previous.text === request.text &&
        previous.writtenAt.getTime() === new Date(request.writtenAt).getTime();

      if (!sameContent) {
        return { kind: "refused", code: ERROR_CODES.CONFLICT };
      }

      const messages = await listMessages(
        tx,
        previous.activationId,
        previous.station,
      );
      const saved = messages.find((message) => message.id === previous.id);
      if (!saved) throw new Error("Stored station message could not be read");
      return { kind: "repeat", message: saved };
    }

    const checked = await validateActiveActivation(
      tx,
      user,
      request.activationId,
    );
    if (checked.kind === "refused") return checked;

    const { activation } = checked;

    // Only stations required by this activation can have a thread.
    if (!(await stationIsRequired(tx, activation.activationId, station))) {
      return { kind: "refused", code: ERROR_CODES.STATION_NOT_IN_SCENARIO };
    }

    if (user.role === "STEWARD") {
      await lockStewardPosition(tx, user.userId);
      if (
        !(await stewardIsCheckedIn(
          tx,
          user.userId,
          activation.activationId,
          station,
        ))
      ) {
        return { kind: "refused", code: ERROR_CODES.NOT_CHECKED_IN_AT_STATION };
      }
    }

    await lockStationThread(tx, activation.activationId, station);

    const message = await insertStationMessage(tx, {
      clientMessageId,
      activationId: activation.activationId,
      station,
      // The token's role decides the sender; the steward's ID is not saved on the message.
      sender: user.role === "STEWARD" ? "STATION" : "CONTROL_ROOM",
      text: request.text,
      writtenAt: new Date(request.writtenAt),
    });

    await appendStationMessageEvent(tx, {
      message,
      lineGroup: activation.lineGroup,
    });

    const thread = makeThread(
      activation.activationId,
      station,
      await listMessages(tx, activation.activationId, station),
      false,
    );

    // The message and its log event are in one transaction, so both succeed or neither does.
    return {
      kind: "created",
      message,
      activation: {
        activationId: activation.activationId,
        lineGroup: activation.lineGroup,
      },
      thread,
    };
  });
}

export async function readStationThread(
  user: AuthUser,
  station: string,
): Promise<ThreadView | Refusal> {
  return getDatabase().begin(async (tx) => {
    const activation = await findActiveActivation(user.lineGroup, tx);
    if (!activation) {
      return { kind: "refused", code: ERROR_CODES.NO_ACTIVE_SCENARIO };
    }

    if (!(await stationIsRequired(tx, activation.activationId, station))) {
      return { kind: "refused", code: ERROR_CODES.STATION_NOT_IN_SCENARIO };
    }

    if (user.role === "STEWARD") {
      await lockStewardPosition(tx, user.userId);
      if (
        !(await stewardIsCheckedIn(
          tx,
          user.userId,
          activation.activationId,
          station,
        ))
      ) {
        return { kind: "refused", code: ERROR_CODES.NOT_CHECKED_IN_AT_STATION };
      }
    }

    const messages = await listMessages(tx, activation.activationId, station);
    // Reading only builds the response; it doesn't change the thread.
    return makeThread(activation.activationId, station, messages, true);
  });
}

export async function listStationThreads(
  user: AuthUser,
): Promise<ThreadView[]> {
  return getDatabase().begin(async (tx) => {
    const activation = await findActiveActivation(user.lineGroup, tx);
    if (!activation) return [];

    const messages = await listMessages(tx, activation.activationId);
    const byStation = new Map<string, StationMessage[]>();

    for (const message of messages) {
      const stationMessages = byStation.get(message.station) ?? [];
      stationMessages.push(message);
      byStation.set(message.station, stationMessages);
    }

    const threads = Array.from(byStation, ([station, stationMessages]) =>
      makeThread(activation.activationId, station, stationMessages, false),
    );

    // Put unanswered threads first (oldest first), then answered threads (newest first).
    return threads.sort((a, b) => {
      if (a.state !== b.state) return a.state === "UNANSWERED" ? -1 : 1;

      if (a.state === "UNANSWERED") {
        return a.unansweredSince!.localeCompare(b.unansweredSince!);
      }

      return b.lastMessageAt!.localeCompare(a.lastMessageAt!);
    });
  });
}
