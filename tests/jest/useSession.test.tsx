import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useSession, type SessionStore } from "../../shared/auth/use-session";

const API_URL = "http://localhost:4010";
function session(token: string, expiresInDays: number) {
  return {
    token,
    role: "STEWARD" as const,
    expiresAt: new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

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
    const oldSession = session("old-token", 1);
    const renewedSession = session("renewed-token", 30);
    const store: SessionStore = {
      load: jest.fn(async () => oldSession),
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

        return response(200, renewedSession);
      });

    render(<SessionProbe store={store} />);

    await waitFor(() => {
      expect(screen.getByText("signed-in:renewed-token")).toBeTruthy();
    });

    expect(store.save).toHaveBeenCalledWith(renewedSession);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
