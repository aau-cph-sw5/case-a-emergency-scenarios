import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import { SCENARIO_CHANNEL_ID } from "../../../shared/push-channels";
import type { PushTokenRequest } from "../../../shared/types/v1/push-token-request";
import { apiBaseUrl } from "../api-base-url";

// Push needs a development build: Expo Go and the web cannot receive it
export function canReceivePush(): boolean {
  return Platform.OS === "android" && !isRunningInExpoGo();
}

// Gives the server this phone's FCM token, so a logged-in steward gets
// notifications while the app is in the background or closed (ADR 0014).
// Returns the token sent, or undefined when nothing was sent. A known token,
// from FCM's token listener, is sent as it is.
export async function registerPush(
  sessionToken: string,
  signal: AbortSignal,
  knownToken?: string,
): Promise<string | undefined> {
  if (!canReceivePush()) return undefined;

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
  if (!granted) return undefined;

  const pushToken =
    knownToken ?? (await Notifications.getDevicePushTokenAsync()).data;
  if (typeof pushToken !== "string" || pushToken.length === 0) {
    throw new Error("FCM returned no push token");
  }
  // Signed out or another account while the native calls ran. A request
  // already sent is safe: the server refuses it for an ended session.
  if (signal.aborted) return undefined;

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
  return pushToken;
}

// Deletes this phone's FCM token. FCM then refuses pushes to it, and the
// server drops it, even when the logout itself never reached the server.
export async function unregisterPush(): Promise<void> {
  if (!canReceivePush()) return;
  await Notifications.unregisterForNotificationsAsync();
}
