import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, jest } from "@jest/globals";
import { OperatorDashboard } from "../../web/src/OperatorDashboard";

jest.mock("../../web/src/local-settings", () => ({
  mockStewardPositions: false,
}));
jest.mock("../../web/src/components/StewardPositions", () => ({
  StewardPositions: () => null,
}));
jest.mock("../../web/src/components/LiveStatusBar", () => ({
  LiveStatusBar: () => null,
}));
jest.mock("../../web/src/ActiveScenarioBanner", () => ({
  ActiveScenarioBanner: () => null,
}));
jest.mock("../../web/src/components/ScenarioWorkspace", () => ({
  ScenarioWorkspace: ({ lineGroup }: { lineGroup: string }) => (
    <div data-testid="line-group">{lineGroup}</div>
  ),
}));

it("switches the map line group using the top bar", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(<OperatorDashboard token="test" onLogout={() => {}} />),
  );
  const [m1m2, m3m4] = container.querySelectorAll<HTMLButtonElement>(
    ".operator-line-switcher button",
  );
  expect(m1m2.getAttribute("aria-pressed")).toBe("true");
  expect(
    container.querySelector('[data-testid="line-group"]')?.textContent,
  ).toBe("M1/M2");
  await act(async () => m3m4.click());
  expect(m3m4.getAttribute("aria-pressed")).toBe("true");
  expect(
    container.querySelector('[data-testid="line-group"]')?.textContent,
  ).toBe("M3/M4");
  await act(async () => m1m2.click());
  expect(
    container.querySelector('[data-testid="line-group"]')?.textContent,
  ).toBe("M1/M2");
  await act(async () => root.unmount());
  container.remove();
});
