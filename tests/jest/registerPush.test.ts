import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPush } from "../../mobile/src/push/register-push";

jest.mock("expo", () => ({ isRunningInExpoGo: jest.fn(() => false) }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getDevicePushTokenAsync: jest.fn(async () => ({
    type: "android",
    data: "fcm-token",
  })),
}));

const notifications = jest.mocked(Notifications);

function response(status: number): Response {
  return new Response(null, { status });
}

beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "android");
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("registerPush", () => {
  it("creates the scenario channel and gives the server the phone's FCM token", async () => {
    const fetch = jest.spyOn(global, "fetch").mockResolvedValue(response(204));

    await registerPush("session-token");

    // Also shown while the app is open (#413)
    const handler = notifications.setNotificationHandler.mock.calls[0][0];
    await expect(
      handler?.handleNotification({} as Notifications.Notification),
    ).resolves.toMatchObject({ shouldShowBanner: true });
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "scenarios",
      expect.objectContaining({ importance: 4 }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/me/push-token"),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
        body: JSON.stringify({ pushToken: "fcm-token" }),
      }),
    );
  });

  it("sends nothing when the steward does not allow notifications", async () => {
    notifications.requestPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    const fetch = jest.spyOn(global, "fetch");

    await registerPush("session-token");

    expect(notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails when the server does not store the token", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(response(401));

    await expect(registerPush("session-token")).rejects.toThrow("401");
  });

  it("does nothing outside a development build on Android", async () => {
    jest.mocked(isRunningInExpoGo).mockReturnValueOnce(true);
    const fetch = jest.spyOn(global, "fetch");

    await registerPush("session-token");
    jest.replaceProperty(Platform, "OS", "web");
    await registerPush("session-token");

    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
