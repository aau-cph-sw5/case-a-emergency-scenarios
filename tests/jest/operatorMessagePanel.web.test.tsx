import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, jest } from "@jest/globals";
import type { StationMessage } from "../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request";
import { OperatorMessagePanel } from "../../web/src/components/OperatorMessagePanel";
import { useStationThreads } from "../../web/src/data/useStationThreads";

jest.mock("../../web/src/local-settings", () => ({
  notificationTestShortcuts: true,
}));
jest.mock("../../web/src/data/liveData", () => {
  const activations = [
    {
      activationId: 1,
      lineGroup: "M3_M4",
      deployments: [
        { fulfills: "FOR" },
        { fulfills: "ORE" },
        { fulfills: "SOT" },
      ],
    },
  ];
  return { useLiveData: () => ({ activations, isConnected: true }) };
});
jest.mock("../../web/src/data/useStationThreads");

const stationThreads = jest.mocked(useStationThreads);
const writtenAt = "2026-11-17T08:36:00.000Z";

function stationMessage(
  id: number,
  station: string,
  text: string,
  messageTime = writtenAt,
): StationMessage {
  return {
    id,
    station,
    text,
    activationId: 1,
    clientMessageId: `test-${id}`,
    sender: "STATION",
    writtenAt: messageTime,
    receivedAt: messageTime,
  };
}

function setup(token = "test") {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  const launcher = () =>
    container.querySelector<HTMLButtonElement>(".operator-message-button")!;
  const messages = () => [
    ...container.querySelectorAll(".operator-thread ol li"),
  ];
  const composer = () =>
    container.querySelector<HTMLFormElement>(".operator-thread form");
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find(
      (element) => element.textContent?.trim() === label,
    )!;
  const stationButtons = () => [
    ...container.querySelectorAll<HTMLButtonElement>("nav li button"),
  ];
  const stationButton = (name: string) =>
    stationButtons().find(
      (element) => element.querySelector("strong")?.textContent === name,
    )!;
  const savedButton = () =>
    container.querySelector<HTMLButtonElement>(
      ".operator-saved-toolbar button",
    )!;
  const pin = (index: number) =>
    messages()[index].querySelector<HTMLButtonElement>(
      ".operator-message-pin",
    )!;
  const click = (element: HTMLElement) => act(async () => element.click());

  return {
    container,
    launcher,
    messages,
    composer,
    button,
    stationButton,
    stationButtons,
    savedButton,
    pin,
    click,
    render: () =>
      act(async () =>
        root.render(<OperatorMessagePanel token={token} lineGroup="M3_M4" />),
      ),
    send: (text: string) =>
      act(async () => {
        const field = composer()!.querySelector("textarea")!;
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )!.set!.call(field, text);
        field.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
        composer()!.querySelector("button")!.click();
      }),
    destroy: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

it("keeps recent conversations first while clearing unread badges and sending to an empty chat", async () => {
  const send = jest.fn(
    async (
      station: string,
      request: StationMessageRequest,
    ): Promise<StationMessage> => ({
      ...request,
      station,
      id: 5,
      receivedAt: request.writtenAt,
      sender: "CONTROL_ROOM",
    }),
  );
  const forMessage = stationMessage(1, "FOR", "Rulletrappe gået i stå");
  const olderTime = "2026-11-17T08:35:00.000Z";
  const oreMessage = stationMessage(2, "ORE", "Mange mennesker", olderTime);
  const oreFollowUp = stationMessage(6, "ORE", "Vagten er ankommet");
  const history = {
    FOR: {
      activationId: 1,
      station: "FOR",
      state: "UNANSWERED" as const,
      unansweredSince: writtenAt,
      lastMessageAt: writtenAt,
      stationMessageIds: [forMessage.id],
      messages: [forMessage],
    },
    ORE: {
      activationId: 1,
      station: "ORE",
      state: "UNANSWERED" as const,
      unansweredSince: olderTime,
      lastMessageAt: "2026-11-17T08:37:00.000Z",
      stationMessageIds: [oreMessage.id, oreFollowUp.id],
      messages: [oreMessage, oreFollowUp],
    },
    SOT: {
      activationId: 1,
      station: "SOT",
      state: "ANSWERED" as const,
      unansweredSince: null,
      lastMessageAt: null,
      stationMessageIds: [],
      messages: [],
    },
  };
  stationThreads.mockImplementation((_token, _activationId, station) => ({
    history,
    threads: [history.FOR, history.ORE],
    thread: station ? history[station as keyof typeof history] : null,
    listError: null,
    threadError: null,
    closed: false,
    reload: jest.fn(),
    send,
  }));
  const panel = setup();
  try {
    await panel.render();
    expect(panel.launcher().getAttribute("aria-label")).toBe(
      "Beskeder, 3 ulæste beskeder",
    );
    await panel.click(panel.launcher());
    expect(panel.stationButtons()).toEqual([
      panel.stationButton("ORE"),
      panel.stationButton("FOR"),
      panel.stationButton("SOT"),
    ]);
    await panel.click(panel.stationButton("FOR"));
    expect(panel.stationButton("FOR").textContent).toBe("FOR");
    expect(panel.stationButton("ORE").textContent).toContain("2 ulæst");
    expect(panel.messages()[0].querySelector("time")?.dateTime).toBe(writtenAt);
    expect(panel.launcher().getAttribute("aria-label")).toBe(
      "Beskeder, 2 ulæste beskeder",
    );

    history.FOR.messages.push(
      stationMessage(3, "FOR", "Besked mens chatten er åben"),
    );
    history.FOR.stationMessageIds.push(3);
    await panel.render();
    expect(panel.stationButton("FOR").textContent).toBe("FOR");
    await panel.click(panel.savedButton());
    history.FOR.messages.push(
      stationMessage(4, "FOR", "Besked mens Gemt er åbent"),
    );
    history.FOR.stationMessageIds.push(4);
    await panel.render();
    expect(panel.stationButton("FOR").textContent).toContain("1 ulæst");

    await panel.click(panel.stationButton("SOT"));
    await panel.send("Teknikker er sendt");
    expect(send).toHaveBeenCalledWith(
      "SOT",
      expect.objectContaining({
        activationId: 1,
        text: "Teknikker er sendt",
      }),
    );
    expect(panel.stationButton("ORE").textContent).toContain("2 ulæst");
    expect(panel.stationButton("FOR").textContent).toContain("1 ulæst");

    await panel.click(panel.stationButton("ORE"));
    expect(panel.stationButtons()[0]).toBe(panel.stationButton("ORE"));
    await panel.click(panel.stationButton("FOR"));
    await panel.click(panel.pin(0));
    await panel.click(panel.stationButton("ORE"));
    await panel.click(panel.pin(0));
    await panel.click(panel.savedButton());
    expect(
      panel
        .messages()
        .map((message) => message.querySelector("time")?.dateTime),
    ).toEqual([olderTime, writtenAt]);
  } finally {
    await panel.destroy();
  }
});

it("handles fake chats, pinning, and sending without touching the server", async () => {
  const send = jest.fn<ReturnType<typeof useStationThreads>["send"]>();
  stationThreads.mockReturnValue({
    history: {},
    threads: null,
    thread: null,
    listError: null,
    threadError: null,
    closed: false,
    reload: jest.fn(),
    send,
  });
  const token = `header.${btoa(JSON.stringify({ userId: 10 }))}.signature`;
  const panel = setup(token);
  const press = (key: string, altKey = false) =>
    act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, ctrlKey: true, altKey }),
      );
    });

  try {
    await panel.render();
    await press("b");
    await press(",");
    expect(panel.launcher().getAttribute("aria-label")).toBe("Beskeder");
    await press(",", true);
    expect(panel.launcher().getAttribute("aria-label")).toBe(
      "Beskeder, 3 ulæste beskeder",
    );

    await panel.click(panel.launcher());
    await panel.click(panel.stationButton("FOR"));
    expect(panel.container.textContent).not.toContain("Testbeskeder");
    const original = panel.messages()[0];
    const timestamp = original.querySelector("time")?.dateTime;
    expect(original.querySelector("p")?.textContent).toBe("Hello World!");
    expect(timestamp).toBeTruthy();
    await panel.click(panel.pin(0));
    expect(panel.pin(0).getAttribute("aria-pressed")).toBe("true");
    await panel.send("Teknikker er sendt");
    expect(panel.messages()[1].querySelector("p")?.textContent).toBe(
      "Teknikker er sendt",
    );
    expect(panel.messages()[1].querySelector("time")?.dateTime).toBeTruthy();
    expect(
      panel.messages()[1].querySelector(".operator-message-pin"),
    ).toBeNull();
    expect(send).not.toHaveBeenCalled();

    await panel.click(panel.savedButton());
    expect(panel.composer()).toBeNull();
    expect(panel.messages()).toHaveLength(1);
    expect(panel.messages()[0].querySelector("strong")?.textContent).toBe(
      "FOR",
    );
    expect(panel.messages()[0].querySelector("p")?.textContent).toBe(
      "Hello World!",
    );
    expect(panel.messages()[0].querySelector("time")?.dateTime).toBe(timestamp);

    await panel.click(panel.savedButton());
    expect(panel.savedButton().getAttribute("aria-pressed")).toBe("false");
    expect(panel.stationButton("FOR").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(panel.composer()).not.toBeNull();
    await panel.click(panel.savedButton());
    await panel.click(panel.button("Luk"));
    await panel.click(panel.launcher());
    expect(panel.pin(0).getAttribute("aria-pressed")).toBe("true");
    await panel.click(panel.pin(0));
    expect(panel.messages()).toHaveLength(0);
    await panel.click(panel.stationButton("FOR"));
    expect(panel.pin(0).getAttribute("aria-pressed")).toBe("false");

    await panel.click(panel.stationButton("ORE"));
    await panel.click(panel.pin(0));
    await panel.click(panel.stationButton("SOT"));
    expect(panel.pin(0).getAttribute("aria-pressed")).toBe("false");
    expect(
      JSON.parse(sessionStorage.getItem("metro-station-messages:10:1")!),
    ).toEqual({ readIds: [], pinned: [] });
  } finally {
    await panel.destroy();
  }
});
