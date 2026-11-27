import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, jest } from "@jest/globals";
import { OperatorDashboard } from "../../web/src/OperatorDashboard";

jest.mock("../../web/src/local-settings", () => ({
  mockStewardPositions: false,
  notificationTestShortcuts: true,
}));
let mockActivations: { lineGroup: string | null }[] = [{ lineGroup: "M1_M2" }];
jest.mock("../../web/src/data/liveData", () => ({
  useLiveData: () => ({ activations: mockActivations }),
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
    statusPopup?:
      | false
      | ReactElement<{
          testNotificationCount?: number;
          onOpen?: () => void;
        }>;
    messagePanel?: false | ReactElement<{ testNotificationCount?: number }>;
  }) => (
    <>
      <div data-testid="line-group">{lineGroup}</div>
      <output>{statusPopup && statusPopup.props.testNotificationCount}</output>
      <output>
        {messagePanel && messagePanel.props.testNotificationCount}
      </output>
      <i data-testid="popups">
        {[statusPopup && "status", messagePanel && "messages"]
          .filter(Boolean)
          .join("+") || "none"}
      </i>
      <button
        type="button"
        data-testid="open-status"
        onClick={statusPopup ? statusPopup.props.onOpen : undefined}
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
    root.render(
      <OperatorDashboard token={tokenFor("M1_M2")} onLogout={() => {}} />,
    ),
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

// The dashboard reads the line group from the token's payload.
const tokenFor = (lineGroup: string) =>
  `h.${btoa(JSON.stringify({ lineGroup }))}.s`;

async function renderDashboard(token: string) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const render = () =>
    act(async () =>
      root.render(<OperatorDashboard token={token} onLogout={() => {}} />),
    );
  await render();
  return {
    container,
    render,
    unmount: () => act(async () => root.unmount()),
    popups: () =>
      container.querySelector('[data-testid="popups"]')?.textContent,
  };
}

it("shows the Status and Beskeder buttons only while a scenario is active", async () => {
  mockActivations = [];
  const view = await renderDashboard(tokenFor("M1_M2"));
  expect(view.popups()).toBe("none");
  mockActivations = [{ lineGroup: "M1_M2" }];
  await view.render();
  expect(view.popups()).toBe("status+messages");
  await view.unmount();
});

it("offers Beskeder only on the operator's own line group", async () => {
  mockActivations = [{ lineGroup: "M3_M4" }];
  const view = await renderDashboard(tokenFor("M1_M2"));
  expect(view.popups()).toBe("none");
  const [, m3m4] = view.container.querySelectorAll<HTMLButtonElement>(
    ".operator-line-switcher button",
  );
  await act(async () => m3m4.click());
  // Status follows the selected line group; the messages API is scoped to the
  // token's own group, so Beskeder stays hidden.
  expect(view.popups()).toBe("status");
  await view.unmount();
});
