import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { LoginScreen } from "../../shared/LoginScreen";
import type { Session } from "../../shared/auth/session";

const session: Session = {
  token: "header.payload.signature",
  role: "OPERATOR",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

function response(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

function renderLogin(onLoggedIn = jest.fn(async (_: Session) => undefined)) {
  render(<LoginScreen apiBaseUrl="" client="web" onLoggedIn={onLoggedIn} />);
  return onLoggedIn;
}

function fillIn(username: string, password: string) {
  fireEvent.changeText(screen.getByLabelText("Brugernavn"), username);
  fireEvent.changeText(screen.getByLabelText("Adgangskode"), password);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("LoginScreen", () => {
  it("shows the brand and keeps the button disabled until both fields are filled", () => {
    renderLogin();

    expect(screen.getByText("Metro Service")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Emergency Scenarios" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log ind" })).toBeDisabled();

    fillIn("operator-test", "");
    expect(screen.getByRole("button", { name: "Log ind" })).toBeDisabled();

    fillIn("operator-test", "secret");
    expect(screen.getByRole("button", { name: "Log ind" })).toBeEnabled();
  });

  it("signs in with the trimmed username", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response(200, session));
    const onLoggedIn = renderLogin();

    fillIn("  operator-test ", "secret");
    fireEvent.press(screen.getByRole("button", { name: "Log ind" }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(session));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      username: "operator-test",
      password: "secret",
      client: "web",
    });
  });

  it("says when the username or password is wrong", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(response(401));
    const onLoggedIn = renderLogin();

    fillIn("operator-test", "wrong");
    fireEvent.press(screen.getByRole("button", { name: "Log ind" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Forkert brugernavn eller adgangskode",
    );
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("says when the server cannot be reached", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network request failed"));
    renderLogin();

    fillIn("operator-test", "secret");
    fireEvent(screen.getByLabelText("Adgangskode"), "submitEditing");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kunne ikke nå serveren: Network request failed",
    );
    expect(screen.getByRole("button", { name: "Log ind" })).toBeEnabled();
  });
});
