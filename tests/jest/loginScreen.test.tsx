import { describe, expect, it, jest } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { LoginScreen } from "../../shared/LoginScreen";
import { InvalidCredentialsError, login } from "../../shared/auth/login";
import type { Session } from "../../shared/auth/session";

jest.mock("../../shared/auth/login", () => ({
  login: jest.fn(),
  InvalidCredentialsError: class InvalidCredentialsError extends Error {},
}));

const mockedLogin = jest.mocked(login);
const session: Session = {
  token: "test-token",
  role: "STEWARD",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

describe.each(["web", "mobile"] as const)("%s login", (client) => {
  it("allows the user to sign in with their client role", async () => {
    const onLoggedIn = jest
      .fn<(session: Session) => Promise<void>>()
      .mockResolvedValue();
    mockedLogin.mockResolvedValueOnce(session);
    render(
      <LoginScreen
        apiBaseUrl="http://test"
        client={client}
        onLoggedIn={onLoggedIn}
      />,
    );

    expect(screen.getByText("Metro Service")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Log ind" }).props.accessibilityState
        .disabled,
    ).toBe(true);
    fireEvent.changeText(screen.getByLabelText("Brugernavn"), "  test-user  ");
    fireEvent.changeText(screen.getByLabelText("Adgangskode"), "password");
    fireEvent.press(screen.getByRole("button", { name: "Log ind" }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(session));
    expect(mockedLogin).toHaveBeenCalledWith(
      "http://test",
      "test-user",
      "password",
      client,
    );
  });

  it("shows an error for incorrect credentials", async () => {
    mockedLogin.mockRejectedValueOnce(new InvalidCredentialsError());
    render(
      <LoginScreen apiBaseUrl="" client={client} onLoggedIn={async () => {}} />,
    );
    fireEvent.changeText(screen.getByLabelText("Brugernavn"), "test-user");
    fireEvent.changeText(screen.getByLabelText("Adgangskode"), "wrong");
    fireEvent.press(screen.getByRole("button", { name: "Log ind" }));
    expect(
      await screen.findByText("Forkert brugernavn eller adgangskode"),
    ).toBeTruthy();
  });
});
