import {
  createStationMessageDeliverer,
  type MessageDeliveryResult,
} from "../../../shared/station-messages/deliver";
import { apiBaseUrl } from "../api-base-url";

export type { MessageDeliveryResult };

export const deliverStationMessage = createStationMessageDeliverer(apiBaseUrl);
