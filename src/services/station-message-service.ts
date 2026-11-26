import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request.js";
import type { StationThread } from "../../shared/types/v1/station-thread.js";
import type { StationMessageEvent } from "../../shared/socket/events.js";
import { ERROR_CODES, type ErrorCode } from "../../shared/error-codes.js";
import { getDatabase, type Db } from "../db/client.js";
import { findActiveActivation } from "../repositories/activation-repository.js";
import {
  findByClientMessageId,
  hasActiveActivation,
  insertStationMessage,
  listMessages,
  lockActivationForLineGroup,
  lockClientMessageId,
  lockStationThread,
  lockStewardPosition,
  stationIsRequired,
  stewardIsCheckedIn,
} from "../repositories/station-message-repository.js";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import type { AuthUser } from "./auth-service.js";
import { appendSystemEvent } from "./incident-log-service.js";

type Refusal = { kind: "refused"; code: ErrorCode };

function makeThread(
  activationId: number,
  station: string,
  messages: StationMessage[],
  includeMessages: boolean,
): StationThread {
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
  | { kind: "ok"; activation: { activationId: number; lineGroup: LineGroup } }
  | Refusal
> {
  // A message can only belong to an active scenario in the user's line group.
  const activation = await lockActivationForLineGroup(
    db,
    activationId,
    user.lineGroup,
  );

  if (!activation) {
    return (await hasActiveActivation(db, user.lineGroup))
      ? { kind: "refused", code: ERROR_CODES.SCENARIO_STOOD_DOWN }
      : { kind: "refused", code: ERROR_CODES.NO_ACTIVE_SCENARIO };
  }

  if (!activation.active) {
    return { kind: "refused", code: ERROR_CODES.SCENARIO_STOOD_DOWN };
  }

  return { kind: "ok", activation };
}

// A new message also carries what the live event needs (#334): the line group
// and the thread's state after it, worked out in the same transaction, so the
// event matches what was stored.
export type CreatedStationMessage = {
  kind: "created";
  message: StationMessage;
  lineGroup: LineGroup;
  thread: StationMessageEvent["thread"];
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
      const expectedSender =
        user.role === "STEWARD" ? "STATION" : "CONTROL_ROOM";
      const sameContent =
        previous.lineGroup === user.lineGroup &&
        previous.message.sender === expectedSender &&
        previous.message.activationId === request.activationId &&
        previous.message.station === station &&
        previous.message.text === request.text &&
        Date.parse(previous.message.writtenAt) ===
          Date.parse(request.writtenAt);

      if (!sameContent) {
        return { kind: "refused", code: ERROR_CODES.CONFLICT };
      }

      return { kind: "repeat", message: previous.message };
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

    await appendSystemEvent(tx, "station-thread", {
      type: "STATION_MESSAGE_WRITTEN",
      schemaVersion: 2,
      subject: { type: "station-message", id: String(message.id) },
      activationId: String(message.activationId),
      line: activation.lineGroup,
      payload: {
        station: message.station,
        sender: message.sender,
        text: message.text,
        writtenAt: message.writtenAt,
        receivedAt: message.receivedAt,
      },
      clientTime: new Date(message.writtenAt),
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
      lineGroup: activation.lineGroup,
      thread,
    };
  });
}

export async function readStationThread(
  user: AuthUser,
  station: string,
): Promise<StationThread | Refusal> {
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
): Promise<StationThread[]> {
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
