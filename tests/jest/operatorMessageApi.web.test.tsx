import { EventEmitter } from "node:events";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, jest } from "@jest/globals";
import { FormatError } from "../../shared/api/http";
import type { AppSocket } from "../../shared/socket/createSocket";
import type { StationMessageEvent } from "../../shared/socket/events";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import type { StationMessage } from "../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request";
import type { StationThread } from "../../shared/types/v1/station-thread";
import { OperatorMessagePanel } from "../../web/src/components/OperatorMessagePanel";
import { LiveDataContext } from "../../web/src/data/liveData";
import {
  sendStationMessage,
  stationMessageError,
} from "../../web/src/station-threads";

jest.mock("../../web/src/local-settings", () => ({
  notificationTestShortcuts: false,
}));

const token = `header.${btoa(JSON.stringify({ userId: 1 }))}.signature`;
const timestamp = "2026-11-17T08:36:00.000Z";
const activation: ScenarioState = {
  activationId: 1,
  scenarioId: "scenario-1",
  lineGroup: "M3_M4",
  status: "ACTIVE",
  startedAt: timestamp,
  actor: "operator",
  sequence: 1,
  deployments: [
    { fulfills: "FOR", status: "UNMANNED" },
    { fulfills: "ORE", status: "UNMANNED" },
  ],
};
const threadsPath = "/api/v1/station-threads";
const forPath = `${threadsPath}/FOR`;
const sendPath = `${forPath}/messages`;
const fetchMock = jest.fn<typeof fetch>();
let originalFetch: typeof fetch;
let container: HTMLDivElement;
let root: Root;
let socket: EventEmitter;

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function uuid(id: number): string {
  return `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
}

function stationMessage(
  id: number,
  station: string,
  text: string,
): StationMessage {
  return {
    id,
    station,
    text,
    activationId: activation.activationId,
    clientMessageId: uuid(id),
    sender: "STATION",
    writtenAt: timestamp,
    receivedAt: new Date(Date.parse(timestamp) + id * 1000).toISOString(),
  };
}

function threadSummary(
  station: string,
  messages: StationMessage[],
): StationThread {
  const newest = messages.at(-1);
  return {
    activationId: newest?.activationId ?? activation.activationId,
    station,
    state: newest?.sender === "STATION" ? "UNANSWERED" : "ANSWERED",
    unansweredSince:
      newest?.sender === "STATION" ? messages[0].receivedAt : null,
    lastMessageAt: newest?.receivedAt ?? null,
    stationMessageIds: messages
      .filter(({ sender }) => sender === "STATION")
      .map(({ id }) => id),
  };
}

async function render(
  connected = true,
  activations = [activation],
  sessionToken = token,
) {
  await act(async () =>
    root.render(
      <LiveDataContext.Provider
        value={{
          live: {
            activations,
            isConnected: connected,
            isLoading: false,
            lastUpdatedAt: null,
            scenarios: [],
            scenariosError: null,
            error: null,
            reloadScenarios: jest.fn(),
          },
          loadScenario: jest.fn(),
          socket: socket as unknown as AppSocket,
        }}
      >
        <OperatorMessagePanel token={sessionToken} lineGroup="M3_M4" />
      </LiveDataContext.Provider>,
    ),
  );
}

function launcher() {
  return container.querySelector<HTMLButtonElement>(
    ".operator-message-button",
  )!;
}

function stationButton(station: string) {
  return [...container.querySelectorAll("nav li button")].find(
    (button) => button.querySelector("strong")?.textContent === station,
  ) as HTMLButtonElement;
}

function history() {
  return container.querySelector(".operator-thread ol")?.textContent;
}

function sendButton() {
  return container.querySelector<HTMLButtonElement>("form button")!;
}

function messageField() {
  return container.querySelector<HTMLTextAreaElement>("form textarea")!;
}

async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}

async function writeMessage(text: string) {
  await act(async () => {
    const input = messageField();
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function announceMessage(message: StationMessage) {
  const event: StationMessageEvent = {
    message,
    thread: threadSummary(message.station, [message]),
    sentAt: timestamp,
  };
  await act(async () => {
    socket.emit("station-message", event);
  });
}

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  socket = new EventEmitter();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  globalThis.fetch = originalFetch;
  sessionStorage.clear();
});

it("loads station threads, refreshes on live events and reconnect, and removes threads on stand-down", async () => {
  const messages = {
    FOR: [stationMessage(1, "FOR", "Rulletrappen er stoppet")],
    ORE: [] as StationMessage[],
  };
  fetchMock.mockImplementation(async (path) => {
    if (path === threadsPath) {
      return response([
        threadSummary("FOR", messages.FOR),
        threadSummary("ORE", messages.ORE),
        { ...threadSummary("OLD", []), activationId: 9 },
      ]);
    }
    if (path === forPath)
      return response({
        ...threadSummary("FOR", messages.FOR),
        messages: [...messages.FOR],
      });
    if (path === `${threadsPath}/ORE`)
      return response({
        ...threadSummary("ORE", messages.ORE),
        messages: [...messages.ORE],
      });
    throw new Error(`Unexpected request: ${path}`);
  });

  await render();
  expect(fetchMock).toHaveBeenCalledWith(
    threadsPath,
    expect.objectContaining({ headers: { Authorization: `Bearer ${token}` } }),
  );
  expect(launcher().getAttribute("aria-label")).toContain("1 ulæste");
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([threadsPath]);
  await click(launcher());
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([threadsPath]);
  await click(stationButton("FOR"));
  expect(history()).toContain(messages.FOR[0].text);
  expect(launcher().getAttribute("aria-label")).toBe("Beskeder");

  const previousCalls = fetchMock.mock.calls.length;
  await announceMessage({
    ...stationMessage(2, "FOR", "Gammel besked"),
    activationId: 9,
  });
  expect(fetchMock).toHaveBeenCalledTimes(previousCalls);

  const followUp = stationMessage(3, "FOR", "Teknikeren er ankommet");
  messages.FOR.push(followUp);
  await announceMessage(followUp);
  expect(history()).toContain(followUp.text);

  const otherStation = stationMessage(4, "ORE", "Mange passagerer");
  messages.ORE.push(otherStation);
  await announceMessage(otherStation);
  expect(history()).not.toContain(otherStation.text);
  expect(stationButton("ORE").textContent).toContain("1 ulæst");

  await click(
    container.querySelector<HTMLButtonElement>(".operator-message-pin")!,
  );
  expect(sessionStorage.getItem("metro-station-messages:1:1")).not.toBeNull();

  await render(false);
  expect(container.querySelector('[role="status"]')?.textContent).toContain(
    "Forbindelsen er afbrudt",
  );
  await writeMessage("Tak");
  expect(sendButton().disabled).toBe(true);

  const missed = stationMessage(5, "FOR", "Rulletrappen virker igen");
  messages.FOR.push(missed);
  await render();
  await act(async () => {
    socket.emit("connect");
  });
  expect(history()).toContain(missed.text);
  expect(sendButton().disabled).toBe(false);

  await act(async () => {
    socket.emit("station-threads-closed", {
      activationId: 9,
      sentAt: timestamp,
    });
  });
  expect(messageField()).not.toBeNull();
  await act(async () => {
    socket.emit("station-threads-closed", {
      activationId: 1,
      sentAt: timestamp,
    });
  });
  expect(container.querySelector("form")).toBeNull();
  expect(history()).toBeUndefined();
  expect(container.querySelectorAll("nav li button")).toHaveLength(0);
  expect(launcher().getAttribute("aria-label")).toBe("Beskeder");
  expect(sessionStorage.getItem("metro-station-messages:1:1")).toBeNull();
  expect(container.textContent).toContain(
    "Scenariet er afsluttet. Samtalerne er lukket.",
  );
  expect(socket.listenerCount("station-message")).toBe(0);

  await render(true, []);
  expect(
    container.querySelector<HTMLElement>(".operator-message-panel")?.hidden,
  ).toBe(false);
  expect(container.querySelector("form")).toBeNull();
  expect(history()).toBeUndefined();
  expect(container.querySelectorAll("nav li button")).toHaveLength(0);
  expect(launcher().getAttribute("aria-label")).toBe("Beskeder");
  expect(container.textContent).toContain("Intet aktivt scenarie.");
  expect(sessionStorage.getItem("metro-station-messages:1:1")).toBeNull();
});

it("surfaces request errors and retries a failed send with the same message ID", async () => {
  let listStatus = 404;
  let detailStatus = 409;
  const requests: StationMessageRequest[] = [];
  const messages: StationMessage[] = [];
  fetchMock.mockImplementation(async (path, options) => {
    if (path === threadsPath)
      return listStatus === 200 ? response([]) : response({}, listStatus);
    if (path === forPath)
      return detailStatus === 200
        ? response({
            ...threadSummary("FOR", messages),
            messages: [...messages],
          })
        : response({}, detailStatus);
    if (path === sendPath && options?.method === "POST") {
      const request: StationMessageRequest = JSON.parse(String(options.body));
      requests.push(request);
      if (requests.length === 1) return response({}, 503);
      const message: StationMessage = {
        ...request,
        id: 1,
        station: "FOR",
        sender: "CONTROL_ROOM",
        receivedAt: request.writtenAt,
      };
      messages.push(message);
      return response(message, 201);
    }
    throw new Error(`Unexpected request: ${path}`);
  });

  await render();
  await click(launcher());
  const listAlert = () => container.querySelector("nav [role=alert]");
  expect(listAlert()?.textContent).toContain("Kunne ikke hente samtaler");
  listStatus = 200;
  await click(listAlert()!.querySelector("button")!);
  expect(listAlert()).toBeNull();

  await click(stationButton("FOR"));
  const detailAlert = () =>
    container.querySelector(".operator-thread > [role=alert]");
  expect(detailAlert()?.textContent).toContain("Kunne ikke hente beskeder");
  detailStatus = 200;
  await click(detailAlert()!.querySelector("button")!);
  expect(detailAlert()).toBeNull();
  expect(container.querySelector(".operator-thread")?.textContent).toContain(
    "Ingen beskeder endnu",
  );

  await writeMessage("a".repeat(1001));
  expect(sendButton().disabled).toBe(true);
  expect(messageField().getAttribute("aria-invalid")).toBe("true");

  await writeMessage("Teknikeren er sendt");
  await click(sendButton());
  expect(container.querySelector("form [role=alert]")?.textContent).toContain(
    "Serveren har et problem",
  );
  expect(messageField().value).toBe("Teknikeren er sendt");

  await click(sendButton());
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(
    expect.objectContaining({
      activationId: activation.activationId,
      clientMessageId: expect.any(String),
      text: "Teknikeren er sendt",
    }),
  );
  expect(requests[1]).toEqual(requests[0]);
  expect(fetchMock).toHaveBeenCalledWith(
    sendPath,
    expect.objectContaining({
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }),
  );
  expect(history()).toContain("Teknikeren er sendt");
  expect(messageField().value).toBe("");
});

it("keeps read status and saved messages after remounting and isolates operators and activations", async () => {
  const messages = [
    stationMessage(1, "FOR", "Rulletrappen er stoppet"),
    stationMessage(2, "ORE", "Mange passagerer"),
  ];
  fetchMock.mockImplementation(async (path) => {
    if (path === threadsPath)
      return response(
        messages.map((message) => threadSummary(message.station, [message])),
      );
    const message = messages.find(
      (entry) => path === `${threadsPath}/${entry.station}`,
    )!;
    return response({
      ...threadSummary(message.station, [message]),
      messages: [message],
    });
  });
  const savedButton = () =>
    container.querySelector<HTMLButtonElement>(
      ".operator-saved-toolbar button",
    )!;
  const pinButton = () =>
    container.querySelector<HTMLButtonElement>(".operator-message-pin")!;
  const remount = async () => {
    await act(async () => root.unmount());
    root = createRoot(container);
    await render();
    await click(launcher());
  };

  await render();
  await click(launcher());
  await click(stationButton("FOR"));
  await click(pinButton());
  await remount();
  expect(launcher().getAttribute("aria-label")).toContain("1 ulæste");
  expect(stationButton("FOR").textContent).toBe("FOR");
  expect(stationButton("ORE").textContent).toContain("1 ulæst");
  await click(savedButton());
  expect(history()).toContain(messages[0].text);
  expect(container.querySelector("ol strong")?.textContent).toBe("FOR");
  expect(container.querySelector("ol time")?.getAttribute("datetime")).toBe(
    timestamp,
  );
  expect(container.querySelector("form")).toBeNull();

  const otherToken = `header.${btoa(JSON.stringify({ userId: 2 }))}.signature`;
  await render(true, [activation], otherToken);
  expect(launcher().getAttribute("aria-label")).toContain("2 ulæste");
  await click(savedButton());
  expect(container.querySelector(".operator-thread")?.textContent).toContain(
    "Ingen gemte beskeder",
  );

  await render(true, [{ ...activation, activationId: 2 }]);
  await click(savedButton());
  expect(container.querySelector(".operator-thread")?.textContent).toContain(
    "Ingen gemte beskeder",
  );

  await render();
  await click(savedButton());
  expect(history()).toContain(messages[0].text);
  expect(stationButton("FOR").textContent).toBe("FOR");
  await click(pinButton());
  await remount();
  await click(savedButton());
  expect(container.querySelector(".operator-thread")?.textContent).toContain(
    "Ingen gemte beskeder",
  );
});

it("allows messaging when saved session data is malformed or browser storage is unavailable", async () => {
  fetchMock.mockImplementation(async () => response([]));
  sessionStorage.setItem("metro-station-messages:1:1", "{broken");
  await render();
  expect(launcher().getAttribute("aria-label")).toBe("Beskeder");

  const getItem = jest
    .spyOn(Storage.prototype, "getItem")
    .mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
  const setItem = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
  try {
    await render(true, [{ ...activation, activationId: 2 }]);
    await click(launcher());
    expect(container.querySelector("h2")?.textContent).toBe("Stationsbeskeder");
    expect(getItem).toHaveBeenCalled();
    expect(setItem).toHaveBeenCalled();
  } finally {
    getItem.mockRestore();
    setItem.mockRestore();
  }
});

it("keeps unread counts when history fails and sorts by recent activity instead of unread count", async () => {
  const messages = {
    FOR: [
      stationMessage(1, "FOR", "First"),
      stationMessage(2, "FOR", "Second"),
      stationMessage(3, "FOR", "Third"),
    ],
    ORE: [stationMessage(4, "ORE", "Latest station reply")],
  };
  let historyFails = true;
  fetchMock.mockImplementation(async (path) => {
    if (path === threadsPath)
      return response(
        Object.entries(messages).map(([name, entries]) =>
          threadSummary(name, entries),
        ),
      );
    if (path === forPath)
      return historyFails
        ? response({}, 503)
        : response({
            ...threadSummary("FOR", messages.FOR),
            messages: [...messages.FOR],
          });
    if (path === `${threadsPath}/ORE`)
      throw new Error("An unopened conversation should not be fetched");
    throw new Error(`Unexpected request: ${path}`);
  });
  const stationOrder = () =>
    [...container.querySelectorAll("nav li strong")].map(
      (entry) => entry.textContent,
    );

  await render();
  await click(launcher());
  expect(stationOrder()).toEqual(["ORE", "FOR"]);
  expect(stationButton("FOR").textContent).toContain("3 ulæst");
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([threadsPath]);

  await click(stationButton("FOR"));
  expect(
    container.querySelector(".operator-thread [role=alert]")?.textContent,
  ).toContain("Luk og åbn samtalen igen");
  expect(stationButton("FOR").textContent).toContain("3 ulæst");
  expect(launcher().getAttribute("aria-label")).toContain("4 ulæste");
  expect(stationOrder()).toEqual(["ORE", "FOR"]);

  historyFails = false;
  await click(
    container.querySelector<HTMLButtonElement>(
      ".operator-message-panel header button",
    )!,
  );
  await click(launcher());
  expect(history()).toContain("Third");
  expect(stationButton("FOR").textContent).toBe("FOR");
  expect(stationButton("ORE").textContent).toContain("1 ulæst");
  expect(stationOrder()).toEqual(["ORE", "FOR"]);

  const reply = {
    ...stationMessage(5, "FOR", "Operator reply"),
    sender: "CONTROL_ROOM" as const,
  };
  messages.FOR.push(reply);
  await announceMessage(reply);
  expect(stationOrder()).toEqual(["FOR", "ORE"]);
  expect(history()).toContain(reply.text);
  expect(stationButton("ORE").textContent).toContain("1 ulæst");
});

it("preserves inbox badges on list failures and ignores a history response after switching chats", async () => {
  const forMessage = stationMessage(1, "FOR", "Older message");
  const oreMessage = stationMessage(2, "ORE", "Newer message");
  let failList = false;
  let resolveHistory!: (value: Response) => void;
  let historySignal: AbortSignal | undefined;
  fetchMock.mockImplementation(async (path, options) => {
    if (path === threadsPath)
      return failList
        ? response({}, 503)
        : response([
            threadSummary("FOR", [forMessage]),
            threadSummary("ORE", [oreMessage]),
          ]);
    if (path === forPath) {
      historySignal = options?.signal as AbortSignal;
      return new Promise<Response>((resolve) => {
        resolveHistory = resolve;
      });
    }
    if (path === `${threadsPath}/ORE`)
      return response({
        ...threadSummary("ORE", [oreMessage]),
        messages: [oreMessage],
      });
    throw new Error(`Unexpected request: ${path}`);
  });

  await render();
  await click(launcher());
  await click(stationButton("FOR"));
  await click(stationButton("ORE"));
  expect(historySignal?.aborted).toBe(true);
  await act(async () => {
    resolveHistory(
      response({
        ...threadSummary("FOR", [forMessage]),
        messages: [forMessage],
      }),
    );
  });
  expect(history()).toContain(oreMessage.text);
  expect(history()).not.toContain(forMessage.text);
  expect(stationButton("FOR").textContent).toContain("1 ulæst");

  await click(
    container.querySelector<HTMLButtonElement>(
      ".operator-message-panel header button",
    )!,
  );
  const detailRequests = fetchMock.mock.calls.filter(
    ([path]) => path !== threadsPath,
  ).length;
  failList = true;
  const newer = stationMessage(3, "FOR", "Arrived while panel was closed");
  await act(async () => {
    socket.emit("station-message", {
      message: newer,
      thread: threadSummary("FOR", [forMessage, newer]),
      sentAt: timestamp,
    });
  });
  expect(stationButton("FOR").textContent).toContain("2 ulæst");
  expect(container.querySelector("nav [role=alert]")?.textContent).toContain(
    "Kunne ikke hente samtaler",
  );
  expect(
    fetchMock.mock.calls.filter(([path]) => path !== threadsPath),
  ).toHaveLength(detailRequests);
});

it("removes threads, pins, unread badges, and sessionStorage when the activation disappears", async () => {
  const msg = stationMessage(1, "FOR", "Rulletrappen er stoppet");
  const unread = stationMessage(2, "ORE", "Mange passagerer");
  fetchMock.mockImplementation(async (path) => {
    if (path === threadsPath) {
      return response([
        threadSummary("FOR", [msg]),
        threadSummary("ORE", [unread]),
      ]);
    }
    if (path === forPath) {
      return response({ ...threadSummary("FOR", [msg]), messages: [msg] });
    }
    throw new Error(`Unexpected request: ${path}`);
  });

  await render();
  await click(launcher());
  await click(stationButton("FOR"));
  await click(
    container.querySelector<HTMLButtonElement>(".operator-message-pin")!,
  );
  expect(sessionStorage.getItem("metro-station-messages:1:1")).not.toBeNull();
  expect(launcher().getAttribute("aria-label")).toContain("1 ulæste");

  await render(true, []);
  expect(sessionStorage.getItem("metro-station-messages:1:1")).toBeNull();
  expect(launcher().getAttribute("aria-label")).toBe("Beskeder");
  // The already-open panel stays open showing the empty state instead of slamming shut.
  expect(
    container.querySelector<HTMLElement>(".operator-message-panel")?.hidden,
  ).toBe(false);
  expect(container.querySelectorAll("nav li button")).toHaveLength(0);
  expect(history()).toBeUndefined();
  expect(container.textContent).toContain("Intet aktivt scenarie.");
  await click(
    container.querySelector<HTMLButtonElement>(
      ".operator-saved-toolbar button",
    )!,
  );
  expect(container.querySelector(".operator-thread")?.textContent).toContain(
    "Ingen gemte beskeder",
  );
});

it("clears the replaced activation's sessionStorage on a direct scenario switch", async () => {
  const msg = stationMessage(1, "FOR", "Rulletrappen er stoppet");
  fetchMock.mockImplementation(async (path) => {
    if (path === threadsPath) return response([threadSummary("FOR", [msg])]);
    if (path === forPath) {
      return response({ ...threadSummary("FOR", [msg]), messages: [msg] });
    }
    throw new Error(`Unexpected request: ${path}`);
  });

  await render();
  await click(launcher());
  await click(stationButton("FOR"));
  await click(
    container.querySelector<HTMLButtonElement>(".operator-message-pin")!,
  );
  expect(sessionStorage.getItem("metro-station-messages:1:1")).not.toBeNull();

  await render(true, [{ ...activation, activationId: 2 }]);
  expect(sessionStorage.getItem("metro-station-messages:1:1")).toBeNull();
});

it("rejects schema-invalid HTTP payloads, requests, sessionStorage pins, and Socket.IO events", async () => {
  const invalidRequestError = await sendStationMessage(token, "FOR", {
    activationId: 1,
    clientMessageId: "not-a-uuid",
    text: "Hej",
    writtenAt: timestamp,
  }).catch((error: unknown) => error);
  expect(invalidRequestError).toBeInstanceOf(FormatError);
  expect(stationMessageError(invalidRequestError)).toBe(
    "Beskeden har et ugyldigt format.",
  );
  await expect(
    sendStationMessage(token, "FOR", {
      activationId: 1,
      clientMessageId: uuid(10),
      text: "Hej",
      writtenAt: timestamp,
      staff: "7",
    } as unknown as StationMessageRequest),
  ).rejects.toBeInstanceOf(FormatError);
  expect(fetchMock).not.toHaveBeenCalled();

  const validMsg = stationMessage(1, "FOR", "Gyldig besked");
  sessionStorage.setItem(
    "metro-station-messages:1:1",
    JSON.stringify({
      readIds: [],
      pinned: [
        { ...validMsg, staff: "7" },
        { ...validMsg, id: 2, clientMessageId: "not-a-uuid" },
      ],
    }),
  );

  let mode: "bad-list" | "bad-detail" | "bad-send" | "valid" = "bad-list";
  fetchMock.mockImplementation(async (path, options) => {
    if (path === threadsPath) {
      if (mode === "bad-list") {
        return response([{ ...threadSummary("FOR", [validMsg]), staff: "7" }]);
      }
      return response([threadSummary("FOR", [validMsg])]);
    }
    if (path === forPath) {
      if (mode === "bad-detail") {
        return response({
          ...threadSummary("FOR", [validMsg]),
          messages: [{ ...validMsg, staff: "7" }],
        });
      }
      return response({
        ...threadSummary("FOR", [validMsg]),
        messages: [validMsg],
      });
    }
    if (path === sendPath && options?.method === "POST") {
      const req: StationMessageRequest = JSON.parse(String(options.body));
      return response(
        {
          ...req,
          id: 2,
          station: "FOR",
          sender: "CONTROL_ROOM",
          receivedAt: req.writtenAt,
          userId: 1,
        },
        201,
      );
    }
    throw new Error(`Unexpected request: ${path}`);
  });

  await render();
  await click(launcher());
  expect(container.querySelector("nav [role=alert]")?.textContent).toContain(
    "Kunne ikke hente samtaler",
  );
  // Malformed saved pins were rejected when reading sessionStorage.
  await click(
    container.querySelector<HTMLButtonElement>(
      ".operator-saved-toolbar button",
    )!,
  );
  expect(container.querySelector(".operator-thread")?.textContent).toContain(
    "Ingen gemte beskeder",
  );

  mode = "bad-detail";
  await click(
    container.querySelector<HTMLButtonElement>("nav [role=alert] button")!,
  );
  await click(stationButton("FOR"));
  expect(
    container.querySelector(".operator-thread > [role=alert]")?.textContent,
  ).toContain("Kunne ikke hente beskeder");

  mode = "bad-send";
  await click(
    container.querySelector<HTMLButtonElement>(
      ".operator-thread > [role=alert] button",
    )!,
  );
  expect(history()).toContain("Gyldig besked");
  await writeMessage("Svar");
  await click(sendButton());
  expect(container.querySelector("form [role=alert]")).not.toBeNull();

  // Invalid Socket.IO events are ignored without mutating state or closing.
  const callsBeforeSocket = fetchMock.mock.calls.length;
  await act(async () => {
    socket.emit("station-message", {
      message: { ...stationMessage(3, "ORE", "Lækket"), staff: "7" },
      thread: threadSummary("ORE", [stationMessage(3, "ORE", "Lækket")]),
      sentAt: timestamp,
    });
    socket.emit("station-message", {
      message: stationMessage(4, "ORE", "Manglende sentAt"),
      thread: threadSummary("ORE", [
        stationMessage(4, "ORE", "Manglende sentAt"),
      ]),
      sentAt: "",
    });
    socket.emit("station-message", {
      message: stationMessage(5, "ORE", "Forkert station i thread"),
      thread: threadSummary("FOR", [
        stationMessage(5, "ORE", "Forkert station i thread"),
      ]),
      sentAt: timestamp,
    });
    socket.emit("station-threads-closed", { activationId: 1, sentAt: "" });
    socket.emit("station-threads-closed", {
      activationId: 0,
      sentAt: timestamp,
    });
  });
  expect(fetchMock).toHaveBeenCalledTimes(callsBeforeSocket);
  expect(messageField()).not.toBeNull();
  expect(stationButton("ORE").textContent).toBe("ORE");
});
