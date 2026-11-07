import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { OfflineBanner } from "../../mobile/src/screens/OfflineBanner";

const minutesFromNow = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000).toISOString();

describe("OfflineBanner", () => {
  it("shows no age while the copy is fresh", () => {
    render(
      <OfflineBanner
        savedAt={minutesFromNow(-5)}
        reason="offline"
        onRetry={() => {}}
      />,
    );

    expect(screen.getByText("Offline · gemt kopi")).toBeTruthy();
    expect(screen.queryByText(/min gammel/)).toBeNull();
  });

  it("shows the age of a stale copy", () => {
    render(
      <OfflineBanner
        savedAt={minutesFromNow(-75)}
        reason="offline"
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByText("Kopien er 75 min gammel og kan være forældet"),
    ).toBeTruthy();
  });

  it("says the age is unknown when the clock was turned back", () => {
    render(
      <OfflineBanner
        savedAt={minutesFromNow(30)}
        reason="offline"
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByText("Telefonens ur er ændret, kopiens alder er ukendt"),
    ).toBeTruthy();
    expect(screen.queryByText(/min gammel/)).toBeNull();
  });
});
