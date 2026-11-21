import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import type { PushTokenRequest } from "../../../shared/types/v1/push-token-request";
import { apiBaseUrl } from "../api-base-url";

// The server sends scenario pushes on this channel (src/services/push-service.ts)
const SCENARIO_CHANNEL_ID = "scenarios";

// Gives the server this phone's FCM token, so a logged-in steward gets
// notifications while the app is in the background or closed (ADR 0014).
// Run on every login and app start, so a new token reaches the server too.
export async function registerPush(sessionToken: string): Promise<void> {
  // Push needs a development build: Expo Go and the web cannot receive it
  if (Platform.OS !== "android" || isRunningInExpoGo()) return;

  // Also show the notification while the app is open (#413)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationChannelAsync(SCENARIO_CHANNEL_ID, {
    name: "Scenarier",
    importance: Notifications.AndroidImportance.HIGH,
  });
  // Metro's device management grants this centrally, so stewards are not asked
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;

  const { data: pushToken } = await Notifications.getDevicePushTokenAsync();
  const body: PushTokenRequest = { pushToken };
  const response = await fetch(`${apiBaseUrl}/api/v1/me/push-token`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`PUT /api/v1/me/push-token failed with ${response.status}`);
  }
}
