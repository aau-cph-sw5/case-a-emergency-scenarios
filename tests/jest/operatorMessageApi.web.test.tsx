import { EventEmitter } from "node:events";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, jest } from "@jest/globals";
import type { AppSocket } from "../../shared/socket/createSocket";
import type { StationMessageEvent } from "../../shared/socket/events";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import type { StationMessage } from "../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request";
import type { StationThread } from "../../shared/types/v1/station-thread";
import { OperatorMessagePanel } from "../../web/src/components/OperatorMessagePanel";
import { LiveDataContext } from "../../web/src/data/liveData";

jest.mock("../../web/src/local-settings", () => ({
  notificationTestShortcuts: false,
}));

const token = "operator-token";
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
    clientMessageId: `message-${id}`,
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
    activationId: activation.activationId,
    station,
    state: newest?.sender === "STATION" ? "UNANSWERED" : "ANSWERED",
    unansweredSince:
      newest?.sender === "STATION" ? messages[0].receivedAt : null,
    lastMessageAt: newest?.receivedAt ?? null,
  };
}

async function render(connected = true, activations = [activation]) {
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
        <OperatorMessagePanel token={token} lineGroup="M3_M4" />
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
});

it("loads station threads, refreshes on live events and reconnect, and keeps fetched history after closure", async () => {
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
  await click(launcher());
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
  await render(true, []);
  expect(container.querySelector("form")).toBeNull();
  expect(history()).toContain(missed.text);
  expect(container.textContent).not.toContain("Intet aktivt scenarie.");
  expect(socket.listenerCount("station-message")).toBe(0);
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
