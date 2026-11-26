import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { AppState, type AppStateStatus } from "react-native";
import {
  registerPush,
  unregisterPush,
} from "../../mobile/src/push/register-push";
import { usePushRegistration } from "../../mobile/src/push/usePushRegistration";

jest.mock("../../mobile/src/push/register-push", () => ({
  canReceivePush: jest.fn(() => true),
  registerPush: jest.fn(async () => "fcm-token"),
  unregisterPush: jest.fn(async () => undefined),
}));
jest.mock("expo-notifications", () => ({
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const register = jest.mocked(registerPush);
const tokenListener = jest.mocked(Notifications.addPushTokenListener);

type Props = {
  sessionToken: string | undefined;
  signedOut: boolean;
  online: boolean | null;
};

function renderPush(initialProps: Props) {
  return renderHook(
    ({ sessionToken, signedOut, online }: Props) =>
      usePushRegistration(sessionToken, signedOut, online),
    { initialProps },
  );
}

const signedIn: Props = {
  sessionToken: "session",
  signedOut: false,
  online: true,
};
const signedOut: Props = {
  sessionToken: undefined,
  signedOut: true,
  online: true,
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("usePushRegistration", () => {
  it("gives the server the phone's token once the session is confirmed", async () => {
    renderPush(signedIn);

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(
        "session",
        expect.any(AbortSignal),
        undefined,
      ),
    );
  });

  it("sends a token FCM replaced, and not the one already sent", async () => {
    renderPush(signedIn);
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const onToken = tokenListener.mock.calls[0][0];

    act(() => onToken({ type: "android", data: "fcm-token" }));
    act(() => onToken({ type: "android", data: "rotated-token" }));

    expect(register).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenLastCalledWith(
      "session",
      expect.any(AbortSignal),
      "rotated-token",
    );
  });

  it("retries in the foreground when the token never reached the server", async () => {
    register.mockRejectedValueOnce(new Error("offline"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    let onAppState: (state: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, cb) => {
      onAppState = cb as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
    renderPush(signedIn);
    await waitFor(() => expect(warn).toHaveBeenCalled());

    act(() => onAppState("active"));

    expect(register).toHaveBeenCalledTimes(2);
  });

  it("registers again when the connection returns", async () => {
    const { rerender } = renderPush({ ...signedIn, online: false });
    expect(register).not.toHaveBeenCalled();

    rerender(signedIn);

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
  });

  it("cancels the registration and deletes the token on sign-out", async () => {
    const { rerender } = renderPush(signedIn);
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const registration = register.mock.calls[0][1];

    rerender(signedOut);

    expect(registration.aborted).toBe(true);
    expect(unregisterPush).toHaveBeenCalledTimes(1);
  });

  it("does not delete a token when the app starts signed out", () => {
    renderPush(signedOut);

    expect(unregisterPush).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });
});
