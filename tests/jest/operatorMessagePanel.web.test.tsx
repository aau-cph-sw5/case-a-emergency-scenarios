import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, jest } from "@jest/globals";
import { OperatorMessagePanel } from "../../web/src/components/OperatorMessagePanel";

jest.mock("../../web/src/local-settings", () => ({
  notificationTestShortcuts: true,
}));
jest.mock("../../web/src/data/liveData", () => {
  const activations = [
    {
      activationId: 1,
      lineGroup: "M3_M4",
      deployments: [{ fulfills: "FOR" }, { fulfills: "ØRE" }],
    },
  ];
  return { useLiveData: () => ({ activations, isConnected: false }) };
});
jest.mock("../../web/src/data/useStationThreads", () => ({
  useStationThreads: () => ({
    history: {},
    threads: null,
    thread: null,
    listError: null,
    threadError: null,
    closed: false,
    reload: jest.fn(),
    send: jest.fn(),
  }),
}));

it("counts unread messages and moves a checked message below the unread ones", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(<OperatorMessagePanel token="test" lineGroup="M3_M4" />),
  );
  const launcher = container.querySelector<HTMLButtonElement>(
    ".operator-message-button",
  )!;
  const press = (key: string, altKey = false) =>
    act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, ctrlKey: true, altKey }),
      );
    });

  await press("b");
  await press(",");
  expect(launcher.getAttribute("aria-label")).toBe("Beskeder");
  await press(",", true);
  await press(",", true);
  expect(launcher.getAttribute("aria-label")).toBe(
    "Beskeder, 4 ulæste beskeder",
  );

  await act(async () => launcher.click());
  await act(async () =>
    container.querySelector<HTMLButtonElement>("ul button")!.click(),
  );
  const messages = () => [...container.querySelectorAll("ol li")];
  const [first, second] = messages();
  expect(first.querySelector("p")?.textContent).toBe("Hello World!");
  await act(async () =>
    first
      .querySelector<HTMLButtonElement>('button[aria-label="Svar på besked"]')!
      .click(),
  );
  expect(messages()).toEqual([first, second]);
  expect(first.querySelector("input")?.checked).toBe(false);
  await act(async () =>
    first.querySelector<HTMLInputElement>("input")!.click(),
  );
  expect(launcher.getAttribute("aria-label")).toBe(
    "Beskeder, 3 ulæste beskeder",
  );
  expect(messages()).toEqual([second, first]);
  expect(first.classList.contains("operator-message-read")).toBe(true);
  await act(async () =>
    first.querySelector<HTMLInputElement>("input")!.click(),
  );
  expect(messages()).toEqual([first, second]);
  expect(launcher.getAttribute("aria-label")).toBe(
    "Beskeder, 4 ulæste beskeder",
  );

  await act(async () => root.unmount());
  container.remove();
});
