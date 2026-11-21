import AsyncStorage from "@react-native-async-storage/async-storage";

import { createStationMessageQueueStore } from "../../../shared/offline/station-message-queue";
import { deliverStationMessage } from "../api/station-message";
import { createStationMessageDelivery } from "./station-message-delivery";

export const stationMessageQueueStore =
  createStationMessageQueueStore(AsyncStorage);

export const stationMessageDelivery = createStationMessageDelivery(
  stationMessageQueueStore,
  deliverStationMessage,
);
