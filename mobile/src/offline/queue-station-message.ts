import * as Crypto from "expo-crypto";

import type { QueuedStationMessage } from "../../../shared/offline/station-message-queue";
import { isSendableText, MAX_MESSAGE_LENGTH } from "../data/station-thread";
import {
  notifyStationMessagesChanged,
  stationMessageQueueStore,
} from "./station-message-store";

export type WriteStationMessageInput = {
  userId: string;
  station: string;
  activationId: number;
  text: string;
};

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
  notifyStationMessagesChanged();
  return message;
}
