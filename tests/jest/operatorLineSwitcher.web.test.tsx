import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, jest } from "@jest/globals";
import { OperatorDashboard } from "../../web/src/OperatorDashboard";

jest.mock("../../web/src/local-settings", () => ({
  mockStewardPositions: false,
  notificationTestShortcuts: true,
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
  ScenarioWorkspace: ({
    lineGroup,
    statusPopup,
    messagePanel,
  }: {
    lineGroup: string;
    statusPopup: ReactElement<{
      testNotificationCount?: number;
      onOpen?: () => void;
    }>;
    messagePanel: ReactElement<{ testNotificationCount?: number }>;
  }) => (
    <>
      <div data-testid="line-group">{lineGroup}</div>
      <output>{statusPopup.props.testNotificationCount}</output>
      <output>{messagePanel.props.testNotificationCount}</output>
      <button
        type="button"
        data-testid="open-status"
        onClick={statusPopup.props.onOpen}
      >
        Open Status
      </button>
    </>
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

it("adds and clears test notifications on both buttons", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () =>
    root.render(<OperatorDashboard token="test" onLogout={() => {}} />),
  );
  const counts = () =>
    [...container.querySelectorAll("output")].map((node) => node.textContent);
  const press = (key: string, options: KeyboardEventInit = {}) =>
    act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, ctrlKey: true, ...options }),
      );
    });

  expect(counts()).toEqual(["", ""]);
  await press("n");
  expect(counts()).toEqual(["1", "1"]);
  await press("n", { altKey: true });
  await press("n", { repeat: true });
  expect(counts()).toEqual(["2", "2"]);
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[data-testid="open-status"]')
      ?.click(),
  );
  expect(counts()).toEqual(["0", "2"]);
  await press("m", { altKey: true });
  expect(counts()).toEqual(["0", "0"]);
  await act(async () => root.unmount());
});
