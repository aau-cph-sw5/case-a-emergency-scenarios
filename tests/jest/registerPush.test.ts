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
import {
  registerPush,
  unregisterPush,
} from "../../mobile/src/push/register-push";

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
  unregisterForNotificationsAsync: jest.fn(async () => undefined),
}));

const notifications = jest.mocked(Notifications);

function response(status: number): Response {
  return new Response(null, { status });
}

function signal(): AbortSignal {
  return new AbortController().signal;
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

    await expect(registerPush("session-token", signal())).resolves.toBe(
      "fcm-token",
    );

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

  it("sends a token from FCM's token listener as it is", async () => {
    const fetch = jest.spyOn(global, "fetch").mockResolvedValue(response(204));

    await registerPush("session-token", signal(), "rotated-token");

    expect(notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ pushToken: "rotated-token" }),
      }),
    );
  });

  it("sends nothing when the steward does not allow notifications", async () => {
    notifications.requestPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    const fetch = jest.spyOn(global, "fetch");

    await expect(registerPush("session-token", signal())).resolves.toBe(
      undefined,
    );

    expect(notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends nothing after the steward signed out", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = jest.spyOn(global, "fetch");

    await registerPush("session-token", controller.signal);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails when FCM gives no token", async () => {
    notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      type: "android",
      data: "",
    });
    const fetch = jest.spyOn(global, "fetch");

    await expect(registerPush("session-token", signal())).rejects.toThrow(
      "no push token",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails when the server does not store the token", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(response(401));

    await expect(registerPush("session-token", signal())).rejects.toThrow(
      "401",
    );
  });

  it("does nothing outside a development build on Android", async () => {
    jest.mocked(isRunningInExpoGo).mockReturnValueOnce(true);
    const fetch = jest.spyOn(global, "fetch");

    await registerPush("session-token", signal());
    jest.replaceProperty(Platform, "OS", "web");
    await registerPush("session-token", signal());
    await unregisterPush();

    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(
      notifications.unregisterForNotificationsAsync,
    ).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("unregisterPush", () => {
  it("deletes the phone's FCM token", async () => {
    await unregisterPush();

    expect(notifications.unregisterForNotificationsAsync).toHaveBeenCalled();
  });
});
