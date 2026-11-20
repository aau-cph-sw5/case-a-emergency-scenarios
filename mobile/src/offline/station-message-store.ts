import AsyncStorage from "@react-native-async-storage/async-storage";

import { createStationMessageQueueStore } from "../../../shared/offline/station-message-queue";
import { deliverStationMessage } from "../api/station-message";
import {
  createStationMessageDelivery,
  type MessageFlushResult,
} from "./station-message-delivery";

export const stationMessageQueueStore =
  createStationMessageQueueStore(AsyncStorage);

// Told when the queue may have changed: a message was added, or a send went
// out (from the chat or from the retry loop in StewardView). result is what
// the send did, null when only a message was added or the send failed.
type QueueListener = (result: MessageFlushResult | null) => void;
const listeners = new Set<QueueListener>();

export function onStationMessagesChanged(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyStationMessagesChanged(
  result: MessageFlushResult | null = null,
): void {
  for (const listener of listeners) listener(result);
}

const delivery = createStationMessageDelivery(
  stationMessageQueueStore,
  deliverStationMessage,
);

export const stationMessageDelivery = {
  async flush(userId: string, token: string): Promise<MessageFlushResult> {
    try {
      const result = await delivery.flush(userId, token);
      notifyStationMessagesChanged(result);
      return result;
    } catch (error) {
      notifyStationMessagesChanged(null);
      throw error;
    }
  },
};
