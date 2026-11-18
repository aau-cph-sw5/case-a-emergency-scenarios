import * as Crypto from "expo-crypto";

import type { QueuedStationMessage } from "../../../shared/offline/station-message-queue";
import type { MessageFlushResult } from "./station-message-delivery";
import {
  stationMessageDelivery,
  stationMessageQueueStore,
} from "./station-message-store";

// The contract's limit, counted in Unicode code points.
export const MAX_MESSAGE_LENGTH = 1000;

export type WriteStationMessageInput = {
  userId: string;
  station: string;
  activationId: number;
  text: string;
};

// True when the server would accept the text: something that is not
// whitespace, and at most MAX_MESSAGE_LENGTH characters.
export function isSendableText(text: string): boolean {
  return text.trim().length > 0 && [...text].length <= MAX_MESSAGE_LENGTH;
}

// Saves a message on the phone first, with its id and the time written, so it
// survives a lost connection. stationMessageDelivery.flush sends it.
export async function queueStationMessage(
  input: WriteStationMessageInput,
): Promise<QueuedStationMessage> {
  if (!isSendableText(input.text)) {
    throw new Error(
      `A message needs text, at most ${MAX_MESSAGE_LENGTH} characters`,
    );
  }
  const message: QueuedStationMessage = {
    ...input,
    clientMessageId: Crypto.randomUUID(),
    writtenAt: new Date().toISOString(),
  };
  await stationMessageQueueStore.enqueue(message);
  return message;
}

// What the chat calls when the steward sends a message: it is saved on the
// phone and sent at once. Without a connection it stays queued and goes out
// when the phone is back online. sent is null when sending failed outright.
export async function writeStationMessage(
  input: WriteStationMessageInput,
  token: string,
): Promise<{ message: QueuedStationMessage; sent: MessageFlushResult | null }> {
  const message = await queueStationMessage(input);
  const sent = await stationMessageDelivery
    .flush(input.userId, token)
    .catch(() => null);
  return { message, sent };
}
