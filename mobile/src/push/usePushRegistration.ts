import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { canReceivePush, registerPush, unregisterPush } from "./register-push";

// Keeps the server's copy of this phone's push token current while the
// steward is signed in, and deletes the token after signing out (ADR 0014).
// sessionToken: the server-confirmed session, undefined when there is none.
export function usePushRegistration(
  sessionToken: string | undefined,
  signedOut: boolean,
  online: boolean | null,
): void {
  const wasSignedInRef = useRef(false);

  // A logout that could not reach the server (offline) leaves the token on
  // the session for up to 30 days. Deleting it on the phone stops the alerts.
  useEffect(() => {
    if (!signedOut) return;
    if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      unregisterPush().catch((error: unknown) =>
        console.warn("Push unregistration failed:", error),
      );
    }
  }, [signedOut]);

  // Runs again when the connection returns, so a failed registration retries
  useEffect(() => {
    if (!sessionToken || online === false || !canReceivePush()) return;
    wasSignedInRef.current = true;
    const controller = new AbortController();
    let sentToken: string | undefined;

    const register = (knownToken?: string) => {
      registerPush(sessionToken, controller.signal, knownToken).then(
        (pushToken) => {
          if (pushToken) sentToken = pushToken;
        },
        (error: unknown) => {
          if (!controller.signal.aborted) {
            console.warn("Push registration failed:", error);
          }
        },
      );
    };

    register();
    // Back in the foreground: retry if the token never reached the server
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active" && !sentToken) register();
    });
    // FCM replaced the token. Also fires when the app reads the token: after
    // the first send the check ignores that, before it the same token may be
    // sent twice, which changes nothing on the server.
    const tokenListener = Notifications.addPushTokenListener(({ data }) => {
      if (typeof data === "string" && data !== sentToken) register(data);
    });

    return () => {
      controller.abort();
      appState.remove();
      tokenListener.remove();
    };
  }, [sessionToken, online]);
}
