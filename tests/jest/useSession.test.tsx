import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useSession, type SessionStore } from "../../shared/auth/use-session";

const API_URL = "http://localhost:4010";
const OLD_SESSION = {
  token: "old-token",
  role: "STEWARD" as const,
  expiresAt: "2026-10-22T12:00:00.000Z",
};
const RENEWED_SESSION = {
  token: "renewed-token",
  role: "STEWARD" as const,
  expiresAt: "2026-11-20T12:00:00.000Z",
};

function response(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

function SessionProbe({ store }: { store: SessionStore }) {
  const { state } = useSession({
    apiBaseUrl: API_URL,
    allowedRole: "STEWARD",
    store,
  });

  if (state.status === "signed-in" || state.status === "unavailable") {
    return <Text>{`${state.status}:${state.session.token}`}</Text>;
  }

  return <Text>{state.status}</Text>;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useSession", () => {
  it("keeps a renewed session in memory when saving it fails", async () => {
    const store: SessionStore = {
      load: jest.fn(async () => OLD_SESSION),
      save: jest.fn(async () => {
        throw new Error("secure storage unavailable");
      }),
      clear: jest.fn(async () => undefined),
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/api/v1/me")) {
          return response(200, { userId: 1, role: "STEWARD" });
        }

        return response(200, RENEWED_SESSION);
      });

    render(<SessionProbe store={store} />);

    await waitFor(() => {
      expect(screen.getByText("signed-in:renewed-token")).toBeTruthy();
    });

    expect(store.save).toHaveBeenCalledWith(RENEWED_SESSION);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
