// Client-side session helpers. Rules: docs/adr/0001-session-expiry-and-offline-queue.md
// No dependencies, so it runs in the browser, React Native and Node alike.

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Sign in again. Your queued reports are kept and will be sent when you sign in.";

function decodePayload(token) {
  const part = token.split(".")[1];
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
}

// Reads the token's exp claim so expiry is noticed even with no connection.
// Does not verify the signature; that is the server's job. A token that
// cannot be read counts as expired, so the user is sent to sign in.
export function isSessionExpired(token, now = Date.now()) {
  try {
    const { exp } = decodePayload(token);
    return typeof exp !== "number" || exp * 1000 <= now;
  } catch {
    return true;
  }
}
