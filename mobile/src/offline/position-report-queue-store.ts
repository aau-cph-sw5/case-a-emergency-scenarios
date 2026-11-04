
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createPositionReportQueueStore } from
  "../../../shared/offline/position-report-queue";

export const positionReportQueueStore =
  createPositionReportQueueStore(AsyncStorage);
