import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { App } from "../../web/src/App";
import { useSession } from "../../shared/auth/use-session";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";

jest.mock("../../shared/auth/use-session", () => ({ useSession: jest.fn() }));
jest.mock("../../shared/socket/useAuthenticatedSocket", () => ({
  useAuthenticatedSocket: jest.fn(),
}));
jest.mock("../../shared/LoginScreen", () => ({
  LoginScreen: ({ client }: { client: string }) => (
    <div>Login for {client}</div>
  ),
}));
jest.mock("../../web/src/data/liveData", () => ({
  LiveDataProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock("../../web/src/OperatorDashboard", () => ({
  OperatorDashboard: ({ onLogout }: { onLogout: () => void }) => (
    <button onClick={onLogout}>Operator log ud</button>
  ),
}));
jest.mock("../../web/src/socket", () => ({ socket: {} }));

const restore = jest.fn<() => Promise<void>>().mockResolvedValue();
const signOut = jest.fn<() => Promise<void>>().mockResolvedValue();
const retryLogout = jest.fn<() => Promise<void>>().mockResolvedValue();
const completeLogin = jest.fn<() => Promise<void>>().mockResolvedValue();
const session = {
  token: "operator-token",
  role: "OPERATOR" as const,
  expiresAt: "2099-01-01T00:00:00.000Z",
};
let container: HTMLDivElement;
let root: Root;

function setSession(
  state: ReturnType<typeof useSession>["state"],
  logoutStorageError = false,
) {
  jest.mocked(useSession).mockReturnValue({
    state,
    restore,
    signOut,
    retryLogout,
    completeLogin,
    logoutStorageError,
  } as ReturnType<typeof useSession>);
}

async function showApp() {
  await act(async () => root.render(<App />));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("operator app session states", () => {
  it("shows the login for a signed-out operator", async () => {
    setSession({ status: "signed-out" });
    await showApp();
    expect(container.querySelector(".login-page")?.textContent).toContain(
      "Login for web",
    );
    expect(useAuthenticatedSocket).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      restore,
    );
  });

  it("shows loading and retries a failed logout", async () => {
    setSession({ status: "restoring" });
    await showApp();
    expect(container.textContent).toContain("Indlæser session");
    setSession({ status: "signed-out" }, true);
    await showApp();
    expect(container.textContent).toContain(
      "Den gemte session kunne ikke fjernes",
    );
    await act(async () => container.querySelector("button")?.click());
    expect(retryLogout).toHaveBeenCalled();
  });

  it("offers retry or logout when session confirmation is unavailable", async () => {
    setSession({ status: "unavailable", session });
    await showApp();
    expect(container.textContent).toContain("Kan ikke bekræfte din session");
    const buttons = container.querySelectorAll("button");
    await act(async () => buttons[0].click());
    expect(restore).toHaveBeenCalled();
    await act(async () => buttons[1].click());
    expect(signOut).toHaveBeenCalled();
  });

  it("shows the dashboard, revalidates on reconnect and signs out", async () => {
    setSession({ status: "signed-in", session });
    await showApp();
    expect(container.textContent).toContain("Operator log ud");
    expect(useAuthenticatedSocket).toHaveBeenCalledWith(
      expect.anything(),
      session.token,
      restore,
    );
    await act(async () => window.dispatchEvent(new Event("online")));
    await act(async () =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    expect(restore).toHaveBeenCalled();
    await act(async () => container.querySelector("button")?.click());
    expect(signOut).toHaveBeenCalled();
  });

  it("shows the admin placeholder and signs out without an operator socket", async () => {
    setSession({ status: "signed-in", session: { ...session, role: "ADMIN" } });
    await showApp();
    expect(container.querySelector("h1")?.textContent).toBe("Admin");
    expect(container.textContent).not.toContain("Operator log ud");
    expect(useAuthenticatedSocket).toHaveBeenLastCalledWith(
      expect.anything(),
      undefined,
      restore,
    );
    await act(async () => container.querySelector("button")?.click());
    expect(signOut).toHaveBeenCalled();
  });
});
