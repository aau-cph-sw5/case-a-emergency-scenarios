import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ERROR_CODES } from "../../shared/error-codes";
import type { StationMessage } from "../../shared/types/v1/station-message";
import type { StationThread } from "../../shared/types/v1/station-thread";
import { StationChat } from "../../mobile/src/screens/StationChat";
import { rememberOwnMessage } from "../../mobile/src/offline/own-station-messages";
import {
  lastReadMessageId,
  markStationChatRead,
} from "../../mobile/src/offline/station-chat-read";
import { stationMessageDelivery } from "../../mobile/src/offline/station-message-store";
import { motion } from "../../shared/Theme";

// The socket as a list of listeners, so a test can push an event.
const mockListeners = new Map<string, Set<(event: unknown) => void>>();
jest.mock("../../mobile/src/socket", () => ({
  socket: {
    on: (name: string, listener: (event: unknown) => void) => {
      if (!mockListeners.has(name)) mockListeners.set(name, new Set());
      mockListeners.get(name)!.add(listener);
    },
    off: (name: string, listener: (event: unknown) => void) =>
      mockListeners.get(name)?.delete(listener),
  },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-crypto", () => ({
  randomUUID: () => "11111111-1111-4111-8111-111111111111",
}));

const t0820 = "2026-11-17T08:20:00Z";
const t0825 = "2026-11-17T08:25:00Z";

function uuid(id: number): string {
  return `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
}

// Matches MessageBubble's local clock formatting so assertions pass in UTC and local timezones.
function localClock(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emit(name: string, event: unknown) {
  for (const listener of mockListeners.get(name) ?? []) listener(event);
}

function message(
  id: number,
  sender: StationMessage["sender"],
  text: string,
  writtenAt = t0820,
): StationMessage {
  return {
    id,
    clientMessageId: uuid(id),
    activationId: 1,
    station: "Station B",
    sender,
    text,
    writtenAt,
    receivedAt: writtenAt,
  };
}

function answer(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const threadSummary = (
  messages: StationMessage[],
  overrides: Partial<Omit<StationThread, "messages">> = {},
): Omit<StationThread, "messages"> => {
  const ordered = [...messages].sort((a, b) => a.id - b.id);
  const newest = ordered.at(-1);
  const unanswered = newest?.sender === "STATION";
  return {
    activationId: newest?.activationId ?? 1,
    station: newest?.station ?? "Station B",
    state: unanswered ? "UNANSWERED" : "ANSWERED",
    unansweredSince: unanswered ? newest.receivedAt : null,
    lastMessageAt: newest?.receivedAt ?? null,
    stationMessageIds: ordered
      .filter((entry) => entry.sender === "STATION")
      .map((entry) => entry.id),
    ...overrides,
  };
};

const thread = (messages: StationMessage[]): StationThread => ({
  ...threadSummary(messages),
  messages,
});

function emitMessage(msg: StationMessage) {
  emit("station-message", {
    message: msg,
    thread: threadSummary([msg]),
    sentAt: msg.receivedAt,
  });
}

function emitClosed(activationId = 1) {
  emit("station-threads-closed", {
    activationId,
    sentAt: t0825,
  });
}

const onClosedByServer = jest.fn();

// A token with a user id, so the chat can remember the steward's own messages.
const payload = Buffer.from(JSON.stringify({ userId: 7 })).toString(
  "base64url",
);
const token = `header.${payload}.signature`;

function renderChat(station: string | undefined, activationId = 1) {
  return render(
    <StationChat
      token={token}
      station={station}
      activationId={activationId}
      closedReason="Du er ikke længere tjekket ind på stationen."
      onClosedByServer={onClosedByServer}
    />,
  );
}

async function openChat() {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(/^Åbn chat med kontrolrummet/));
  });
}

async function closeChat() {
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Luk chatten"));
  });
}

let fetchMock: jest.SpiedFunction<typeof fetch>;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockListeners.clear();
  onClosedByServer.mockReset();
  fetchMock = jest.spyOn(global, "fetch");
});

afterEach(() => fetchMock.mockRestore());

describe("StationChat (MET-A-029, #335)", () => {
  it("has no tab while the steward is not checked in", () => {
    renderChat(undefined);
    expect(screen.queryByLabelText("Åbn chat med kontrolrummet")).toBeNull();
  });

  it("opens in one tap and shows the earlier messages in order, with who and when", async () => {
    fetchMock.mockResolvedValue(
      answer(
        200,
        thread([
          message(2, "CONTROL_ROOM", "Modtaget.", t0825),
          message(1, "STATION", "Elevatoren er ude af drift."),
        ]),
      ),
    );
    renderChat("Station B");

    await openChat();

    expect(await screen.findByText("Modtaget.")).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Station, en kollega, ${localClock(t0820)}: Elevatoren er ude af drift.`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Kontrolrum, ${localClock(t0825)}: Modtaget.`),
    ).toBeTruthy();
    // By the server's order (id), not by the order of the answer.
    const labels = screen
      .getAllByText(/^(STATION|KONTROLRUM)$/)
      .map((node) => node.props.children);
    expect(labels).toEqual(["STATION", "KONTROLRUM"]);
  });

  it("names the sender once for messages in a row from the same sender", async () => {
    fetchMock.mockResolvedValue(
      answer(
        200,
        thread([
          message(1, "STATION", "Hej."),
          message(2, "CONTROL_ROOM", "Modtaget."),
          message(3, "CONTROL_ROOM", "Vi sender en mere."),
        ]),
      ),
    );
    renderChat("Station B");
    await openChat();
    await screen.findByText("Vi sender en mere.");

    expect(screen.getAllByText("KONTROLRUM")).toHaveLength(1);
    // A screen reader still hears who wrote each message.
    expect(
      screen.getByLabelText(
        `Kontrolrum, ${localClock(t0820)}: Vi sender en mere.`,
      ),
    ).toBeTruthy();
  });

  it("shows a colleague's message from the same station apart from the steward's own", async () => {
    fetchMock
      .mockResolvedValueOnce(
        answer(200, thread([message(1, "STATION", "Fra en kollega.")])),
      )
      .mockResolvedValueOnce(
        answer(201, {
          ...message(2, "STATION", "Fra mig."),
          clientMessageId: "11111111-1111-4111-8111-111111111111",
        }),
      );
    renderChat("Station B");
    await openChat();
    await screen.findByText("Fra en kollega.");

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Fra mig.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    expect(
      await screen.findByLabelText(
        `Station, dig, ${localClock(t0820)}: Fra mig.`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Station, en kollega, ${localClock(t0820)}: Fra en kollega.`,
      ),
    ).toBeTruthy();
  });

  it("still knows the steward's own message after the app starts again", async () => {
    const sent = {
      ...message(2, "STATION", "Fra mig."),
      clientMessageId: "11111111-1111-4111-8111-111111111111",
    };
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockResolvedValueOnce(answer(201, sent));
    const first = renderChat("Station B");
    await openChat();
    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Fra mig.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });
    await screen.findByLabelText(
      `Station, dig, ${localClock(t0820)}: Fra mig.`,
    );
    first.unmount();

    // The server stores the id in upper or lower case; both are the same.
    fetchMock.mockResolvedValue(
      answer(
        200,
        thread([
          message(1, "STATION", "Fra en kollega."),
          { ...sent, clientMessageId: sent.clientMessageId.toUpperCase() },
        ]),
      ),
    );
    renderChat("Station B");
    await openChat();

    expect(
      await screen.findByLabelText(
        `Station, dig, ${localClock(t0820)}: Fra mig.`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Station, en kollega, ${localClock(t0820)}: Fra en kollega.`,
      ),
    ).toBeTruthy();
  });

  it("sends free text and shows the stored message", async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockResolvedValueOnce(
        answer(201, {
          ...message(5, "STATION", "Vi er på plads."),
          clientMessageId: "11111111-1111-4111-8111-111111111111",
        }),
      );
    renderChat("Station B");
    await openChat();
    expect(await screen.findByText(/Ingen beskeder endnu/)).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "  Vi er på plads.  ",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    const [, options] = fetchMock.mock.calls[1];
    expect(JSON.parse(options?.body as string)).toMatchObject({
      clientMessageId: "11111111-1111-4111-8111-111111111111",
      activationId: 1,
      text: "Vi er på plads.",
    });
    expect(screen.getAllByText("Vi er på plads.")).toHaveLength(1);
    expect(screen.queryByText(/Ikke sendt/)).toBeNull();
  });

  it("keeps the text and says so when the message cannot be saved on the phone", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, thread([])));
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Udgang B er ryddet.",
    );
    // The storage mock's setItem is a jest.fn, so this only changes one call.
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error("disk full"));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    expect(screen.getByLabelText("Besked til kontrolrummet").props.value).toBe(
      "Udgang B er ryddet.",
    );
    expect(
      screen.getByText("Beskeden kunne ikke gemmes på telefonen. Prøv igen."),
    ).toBeTruthy();
    // Nothing was saved, so nothing was sent.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Sending again works, and the warning goes.
    fetchMock.mockResolvedValueOnce(
      answer(201, {
        ...message(5, "STATION", "Udgang B er ryddet."),
        clientMessageId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });
    expect(
      screen.queryByText("Beskeden kunne ikke gemmes på telefonen. Prøv igen."),
    ).toBeNull();
    expect(screen.getByLabelText("Besked til kontrolrummet").props.value).toBe(
      "",
    );
    expect(screen.getAllByText("Udgang B er ryddet.")).toHaveLength(1);
  });

  it("saves a message once when Send is tapped twice", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, thread([]))).mockResolvedValue(
      answer(201, {
        ...message(5, "STATION", "Vi er på plads."),
        clientMessageId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Vi er på plads.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText("Vi er på plads.")).toHaveLength(1);
    expect(screen.queryByText(/kunne ikke gemmes/)).toBeNull();
  });

  it("does not send empty text", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    await openChat();

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "   ",
    );
    expect(
      screen.getByLabelText("Send besked").props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it("shows a refused message as not sent with the server's message in Danish", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, thread([]))).mockResolvedValue(
      answer(409, {
        error: {
          code: ERROR_CODES.SCENARIO_STOOD_DOWN,
          message: "'1' is already stood down",
        },
      }),
    );
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Udgang B er ryddet.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    expect(
      await screen.findByText("Ikke sendt. Scenariet er afsluttet."),
    ).toBeTruthy();
    expect(screen.getByText("Udgang B er ryddet.")).toBeTruthy();
    // The app's copy of the scenario is out of date, so it is fetched again.
    expect(onClosedByServer).toHaveBeenCalled();
  });

  it("keeps a message written offline as Afventer, and sends it once the phone is back online", async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(
        answer(201, {
          ...message(7, "STATION", "Hej."),
          clientMessageId: "11111111-1111-4111-8111-111111111111",
        }),
      );
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Hej.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    // Not sent yet, but not failed either: it waits on the phone.
    expect(await screen.findByText("Afventer")).toBeTruthy();
    expect(screen.queryByText(/Ikke sendt/)).toBeNull();
    expect(screen.queryByText("Send igen")).toBeNull();

    // The phone is back online: the reconnect sends the queue.
    await act(async () => {
      await stationMessageDelivery.flush("7", token);
    });

    const first = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    const second = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(second).toEqual(first);
    await waitFor(() => expect(screen.queryByText("Afventer")).toBeNull());
    expect(screen.getAllByText("Hej.")).toHaveLength(1);
  });

  it("does not retry a waiting message by itself after time passes (MET-A-029, #445)", async () => {
    jest.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(answer(200, thread([])))
        .mockRejectedValueOnce(new TypeError("offline"))
        .mockResolvedValue(answer(200, thread([])));
      renderChat("Station B");
      await openChat();
      await screen.findByText(/Ingen beskeder endnu/);
      fireEvent.changeText(
        screen.getByLabelText("Besked til kontrolrummet"),
        "Test.",
      );
      await act(async () => {
        fireEvent.press(screen.getByLabelText("Send besked"));
      });
      expect(await screen.findByText("Afventer")).toBeTruthy();

      const postCallsBefore = fetchMock.mock.calls.filter(
        ([, options]) => options?.method === "POST",
      ).length;

      await act(async () => {
        jest.advanceTimersByTime(60_000);
        emit("connect", undefined);
      });

      const postCallsAfter = fetchMock.mock.calls.filter(
        ([, options]) => options?.method === "POST",
      ).length;
      expect(postCallsAfter).toBe(postCallsBefore);
      expect(screen.getByText("Afventer")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it("still shows a message waiting on the phone after the app starts again", async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValue(answer(200, thread([])));
    const first = renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);
    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Hej.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });
    await screen.findByText("Afventer");
    first.unmount();

    renderChat("Station B");
    await openChat();

    expect(await screen.findByText("Afventer")).toBeTruthy();
    expect(screen.getByText("Hej.")).toBeTruthy();
  });

  it("marks the tab and shows a note when the control room writes while the chat is closed", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();

    await act(async () => {
      emitMessage(message(2, "CONTROL_ROOM", "Vi sender to mere."));
    });

    expect(
      screen.getByTestId("chat-unread", { includeHiddenElements: true }),
    ).toHaveTextContent("1");
    expect(
      screen.getByLabelText("Åbn chat med kontrolrummet, 1 ny besked"),
    ).toBeTruthy();
    expect(screen.getByTestId("message-notice")).toBeTruthy();
    expect(screen.getByText("Vi sender to mere.")).toBeTruthy();

    // Tapping the note opens the chat; the dot and the note go.
    await act(async () => {
      fireEvent.press(screen.getByTestId("message-notice"));
    });
    expect(screen.queryByTestId("message-notice")).toBeNull();
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("counts the control room's messages the steward has not opened, up to 9+", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");

    await act(async () => {
      for (let id = 1; id <= 2; id++)
        emitMessage(message(id, "CONTROL_ROOM", `Besked ${id}.`));
    });
    expect(
      screen.getByTestId("chat-unread", { includeHiddenElements: true }),
    ).toHaveTextContent("2");
    expect(
      screen.getByLabelText("Åbn chat med kontrolrummet, 2 nye beskeder"),
    ).toBeTruthy();

    await act(async () => {
      for (let id = 3; id <= 12; id++)
        emitMessage(message(id, "CONTROL_ROOM", `Besked ${id}.`));
    });
    expect(
      screen.getByTestId("chat-unread", { includeHiddenElements: true }),
    ).toHaveTextContent("9+");

    await act(async () => {
      fireEvent.press(screen.getByTestId("chat-tab"));
    });
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("does not mark the tab for the station's own messages or another station's", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");

    await act(async () => {
      emitMessage(message(2, "STATION", "En kollega skriver."));
      emitMessage({ ...message(3, "CONTROL_ROOM", "Andet."), station: "X" });
    });

    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
  });

  it("shows no note while the chat is open, since the message is in front of the steward", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    await act(async () => {
      emitMessage(message(2, "CONTROL_ROOM", "Modtaget."));
    });

    expect(screen.getByText("Modtaget.")).toBeTruthy();
    expect(screen.queryByTestId("message-notice")).toBeNull();
  });

  it("lets the note go by itself after a while", async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(answer(200, thread([])));
      renderChat("Station B");
      await act(async () => {
        emitMessage(message(2, "CONTROL_ROOM", "Vi sender to mere."));
      });
      expect(screen.getByTestId("message-notice")).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(motion.messageNoticeMs);
      });

      expect(screen.queryByTestId("message-notice")).toBeNull();
      // The dot stays until the chat is opened.
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it("says why the messages could not be read, and reads again", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderChat("Station B");
    await openChat();

    expect(
      await screen.findByText(/^Beskederne kunne ikke hentes\./),
    ).toBeTruthy();

    fetchMock.mockResolvedValue(
      answer(200, thread([message(1, "CONTROL_ROOM", "Modtaget.")])),
    );
    await act(async () => {
      fireEvent.press(screen.getByText("Prøv igen"));
    });

    expect(await screen.findByText("Modtaget.")).toBeTruthy();
    expect(screen.queryByText(/^Beskederne kunne ikke hentes/)).toBeNull();
  });

  it("adds a message pushed over the socket once", async () => {
    fetchMock.mockResolvedValue(
      answer(200, thread([message(1, "STATION", "Hej.")])),
    );
    renderChat("Station B");
    await openChat();
    await screen.findByText("Hej.");

    await act(async () => {
      const reply = message(2, "CONTROL_ROOM", "Modtaget.");
      emitMessage(reply);
      emitMessage(reply);
      // Another station's message is not this thread's.
      emitMessage({ ...message(3, "CONTROL_ROOM", "Andet."), station: "X" });
    });

    expect(screen.getAllByText("Modtaget.")).toHaveLength(1);
    expect(screen.queryByText("Andet.")).toBeNull();
  });

  it("does not show an answer for the station before in the new station's chat", async () => {
    let answerOld: (response: Response) => void = () => {};
    fetchMock
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (answerOld = resolve)),
      )
      .mockResolvedValue(
        answer(200, {
          ...thread([]),
          station: "Station C",
        }),
      );
    const view = renderChat("Station B");
    await openChat();

    view.rerender(
      <StationChat
        token={token}
        station="Station C"
        activationId={1}
        closedReason="Du er ikke længere tjekket ind på stationen."
        onClosedByServer={onClosedByServer}
      />,
    );
    await screen.findByText(/^Ingen beskeder endnu\./);
    await act(async () => {
      answerOld(answer(200, thread([message(1, "CONTROL_ROOM", "Til B.")])));
    });

    expect(screen.queryByText("Til B.")).toBeNull();
    expect(screen.getByText(/^Ingen beskeder endnu\./)).toBeTruthy();
  });

  it("does not show a message sent for the station before in the new station's chat", async () => {
    let answerSend: (response: Response) => void = () => {};
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (answerSend = resolve)),
      )
      .mockResolvedValue(answer(200, { ...thread([]), station: "Station C" }));
    const view = renderChat("Station B");
    await openChat();
    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Til B.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });

    view.rerender(
      <StationChat
        token={token}
        station="Station C"
        activationId={1}
        closedReason="Du er ikke længere tjekket ind på stationen."
        onClosedByServer={onClosedByServer}
      />,
    );
    await screen.findByText(/^Ingen beskeder endnu\./);
    await act(async () => {
      answerSend(answer(201, message(1, "STATION", "Til B.")));
    });

    expect(screen.queryByText("Til B.")).toBeNull();
  });

  it("says why when the steward is checked out while the chat is open", async () => {
    fetchMock.mockResolvedValue(
      answer(200, thread([message(1, "STATION", "Hej.")])),
    );
    const view = renderChat("Station B");
    await openChat();
    await screen.findByText("Hej.");

    view.rerender(
      <StationChat
        token={token}
        station={undefined}
        activationId={1}
        closedReason="Du er ikke længere tjekket ind på stationen."
        onClosedByServer={onClosedByServer}
      />,
    );

    expect(screen.getByText("Chatten er lukket")).toBeTruthy();
    expect(
      screen.getByText("Du er ikke længere tjekket ind på stationen."),
    ).toBeTruthy();
    expect(screen.getByText("Station B")).toBeTruthy();
    expect(screen.queryByLabelText("Besked til kontrolrummet")).toBeNull();
    expect(screen.queryByLabelText("Åbn chat med kontrolrummet")).toBeNull();
  });

  it("closes when the server closes the station's threads", async () => {
    fetchMock.mockResolvedValue(
      answer(200, thread([message(1, "STATION", "Hej.")])),
    );
    renderChat("Station B");
    await openChat();
    await screen.findByText("Hej.");

    await act(async () => {
      emitClosed(1);
    });

    expect(screen.getByText("Chatten er lukket")).toBeTruthy();
    expect(screen.getByText("Scenariet er afsluttet.")).toBeTruthy();
    expect(screen.queryByText("Hej.")).toBeNull();
    expect(onClosedByServer).toHaveBeenCalled();
  });

  it("hides ChatTab and MessageNotice as soon as station-threads-closed arrives before scenario refresh", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      emitMessage(message(2, "CONTROL_ROOM", "Vi sender hjælp."));
    });
    expect(screen.getByTestId("chat-tab")).toBeTruthy();
    expect(screen.getByTestId("message-notice")).toBeTruthy();

    await act(async () => {
      emitClosed(1);
    });

    expect(screen.queryByTestId("chat-tab")).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    expect(onClosedByServer).toHaveBeenCalled();
  });

  it("clears messages, pending entries, and notice when threadKey becomes undefined", async () => {
    fetchMock.mockResolvedValue(
      answer(200, thread([message(1, "CONTROL_ROOM", "Vi kommer.")])),
    );
    const view = renderChat("Station B");
    await waitFor(() =>
      expect(screen.getByTestId("message-notice")).toBeTruthy(),
    );

    view.rerender(
      <StationChat
        token={token}
        station={undefined}
        activationId={undefined}
        closedReason="Scenariet er afsluttet."
        onClosedByServer={onClosedByServer}
      />,
    );
    expect(screen.queryByTestId("chat-tab")).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
    expect(screen.queryByText("Vi kommer.")).toBeNull();
  });

  it("deduplicates a pending own message against a delivered message by lowercased clientMessageId", async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockRejectedValueOnce(new TypeError("offline"));
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    fireEvent.changeText(
      screen.getByLabelText("Besked til kontrolrummet"),
      "Vi mangler folk.",
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Send besked"));
    });
    expect(await screen.findByText("Afventer")).toBeTruthy();

    // Server delivers the same message over Socket.IO with uppercase UUID before queue ack.
    await act(async () => {
      emitMessage({
        ...message(9, "STATION", "Vi mangler folk."),
        clientMessageId: "11111111-1111-4111-8111-111111111111".toUpperCase(),
      });
    });

    expect(screen.queryByText("Afventer")).toBeNull();
    expect(screen.getAllByText("Vi mangler folk.")).toHaveLength(1);
  });

  it("ignores schema-invalid station-message and station-threads-closed socket payloads", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      emit("station-message", {
        message: {
          ...message(2, "CONTROL_ROOM", "Lækket."),
          sender: "STEWARD",
        },
        thread: threadSummary([message(2, "CONTROL_ROOM", "Lækket.")]),
        sentAt: t0820,
      });
      emit("station-message", {
        message: message(3, "CONTROL_ROOM", "Tomt thread."),
        thread: {},
        sentAt: t0820,
      });
      emit("station-message", {
        message: message(4, "CONTROL_ROOM", "Ugyldig sentAt."),
        thread: threadSummary([message(4, "CONTROL_ROOM", "Ugyldig sentAt.")]),
        sentAt: "",
      });
      emit("station-message", {
        message: message(5, "CONTROL_ROOM", "Forkert station i thread."),
        thread: threadSummary(
          [message(5, "CONTROL_ROOM", "Forkert station i thread.")],
          { station: "Station C" },
        ),
        sentAt: t0820,
      });
      emit("station-threads-closed", { activationId: 1, sentAt: "" });
      emit("station-threads-closed", {
        activationId: 0,
        sentAt: t0825,
      });
    });

    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
    expect(screen.getByTestId("chat-tab")).toBeTruthy();
    expect(onClosedByServer).not.toHaveBeenCalled();
  });
});

describe("StationChat unread across reconnects (MET-A-029, #446)", () => {
  it("shows a badge at startup for unread control-room messages already in the thread", async () => {
    fetchMock.mockResolvedValue(
      answer(
        200,
        thread([
          message(1, "STATION", "Elevatoren er ude af drift."),
          message(2, "CONTROL_ROOM", "Modtaget."),
          message(3, "CONTROL_ROOM", "Tekniker er på vej."),
        ]),
      ),
    );
    renderChat("Station B");

    await waitFor(() =>
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("2"),
    );
    expect(screen.queryByTestId("station-chat")).toBeNull();
  });

  it("remembers what was read across an app restart and counts only new replies", async () => {
    const initial = [
      message(1, "STATION", "Vi er på plads."),
      message(2, "CONTROL_ROOM", "Modtaget."),
    ];
    fetchMock.mockResolvedValue(answer(200, thread(initial)));
    const first = renderChat("Station B");
    await openChat();
    await screen.findByText("Modtaget.");
    await waitFor(async () =>
      expect(await lastReadMessageId("7", 1, "Station B")).toBe(2),
    );
    await closeChat();
    first.unmount();

    const readsBeforeSecond = fetchMock.mock.calls.length;
    const second = renderChat("Station B");
    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(readsBeforeSecond),
    );
    await act(async () => {});
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
    second.unmount();

    fetchMock.mockResolvedValue(
      answer(
        200,
        thread([
          ...initial,
          message(3, "CONTROL_ROOM", "Afløsning kommer kl. 09:00."),
        ]),
      ),
    );
    renderChat("Station B");

    await waitFor(() =>
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("1"),
    );
    expect(screen.getByTestId("message-notice")).toBeTruthy();
    expect(screen.getByText("Afløsning kommer kl. 09:00.")).toBeTruthy();
  });

  it("updates the badge and note when a reply is found after socket reconnect", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, thread([])));
    renderChat("Station B");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();

    fetchMock.mockResolvedValueOnce(
      answer(200, thread([message(4, "CONTROL_ROOM", "Bliv på stationen.")])),
    );
    await act(async () => {
      emit("connect", undefined);
    });

    await waitFor(() =>
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("1"),
    );
    expect(screen.getByTestId("message-notice")).toBeTruthy();
    expect(screen.getByText("Bliv på stationen.")).toBeTruthy();
  });

  it("updates the badge and note when a reply is found on app foregrounding", async () => {
    const appStateListeners: Array<(state: string) => void> = [];
    const originalImpl = jest.isMockFunction(AppState.addEventListener)
      ? AppState.addEventListener.getMockImplementation()
      : undefined;
    const spy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((type, listener) => {
        if (type === "change") {
          appStateListeners.push(listener as (state: string) => void);
        }
        return { remove: jest.fn() };
      });
    try {
      fetchMock.mockResolvedValueOnce(answer(200, thread([])));
      renderChat("Station B");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await act(async () => {});

      fetchMock.mockResolvedValueOnce(
        answer(
          200,
          thread([message(6, "CONTROL_ROOM", "Vi åbner udgang nord.")]),
        ),
      );
      await act(async () => {
        for (const listener of appStateListeners) listener("active");
      });

      await waitFor(() =>
        expect(
          screen.getByTestId("chat-unread", { includeHiddenElements: true }),
        ).toHaveTextContent("1"),
      );
      expect(screen.getByTestId("message-notice")).toBeTruthy();
      expect(screen.getByText("Vi åbner udgang nord.")).toBeTruthy();
    } finally {
      spy.mockRestore();
      if (originalImpl && jest.isMockFunction(AppState.addEventListener)) {
        AppState.addEventListener.mockImplementation(originalImpl);
      }
    }
  });

  it("does not double-count a reply seen live and again on reconnect", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, thread([])));
    renderChat("Station B");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});

    const reply = message(5, "CONTROL_ROOM", "Vi sender en kollega.");
    await act(async () => {
      emitMessage(reply);
    });
    expect(
      screen.getByTestId("chat-unread", { includeHiddenElements: true }),
    ).toHaveTextContent("1");

    fetchMock.mockResolvedValueOnce(answer(200, thread([reply])));
    await act(async () => {
      emit("connect", undefined);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(
      screen.getByTestId("chat-unread", { includeHiddenElements: true }),
    ).toHaveTextContent("1");
  });

  it("ignores own and colleague station messages found on reconnect", async () => {
    const ownId = uuid(99);
    await rememberOwnMessage("7", 1, "Station B", ownId);
    fetchMock.mockResolvedValueOnce(answer(200, thread([])));
    renderChat("Station B");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});

    fetchMock.mockResolvedValueOnce(
      answer(
        200,
        thread([
          {
            ...message(7, "STATION", "Fra mig."),
            clientMessageId: ownId,
          },
          message(8, "STATION", "Fra en kollega."),
        ]),
      ),
    );
    await act(async () => {
      emit("connect", undefined);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
  });

  it("clears the badge and stores the newest id when opened", async () => {
    const messages = [
      message(1, "CONTROL_ROOM", "Første svar."),
      message(4, "CONTROL_ROOM", "Andet svar."),
    ];
    fetchMock.mockResolvedValue(answer(200, thread(messages)));
    const first = renderChat("Station B");

    await waitFor(() =>
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("2"),
    );

    await openChat();
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    await waitFor(async () =>
      expect(await lastReadMessageId("7", 1, "Station B")).toBe(4),
    );
    first.unmount();

    const readsBeforeRemount = fetchMock.mock.calls.length;
    renderChat("Station B");
    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(readsBeforeRemount),
    );
    await act(async () => {});
    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("marks messages arriving while open as read before the chat closes", async () => {
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    await openChat();
    await screen.findByText(/Ingen beskeder endnu/);

    await act(async () => {
      emitMessage(message(9, "CONTROL_ROOM", "Vi er på vej."));
    });
    await waitFor(async () =>
      expect(await lastReadMessageId("7", 1, "Station B")).toBe(9),
    );

    await closeChat();

    expect(
      screen.queryByTestId("chat-unread", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByTestId("message-notice")).toBeNull();
  });

  it("does not reuse a read marker from another station or activation", async () => {
    await markStationChatRead("7", 1, "Station B", 10);
    fetchMock.mockResolvedValue(
      answer(200, {
        ...thread([
          {
            ...message(3, "CONTROL_ROOM", "Til station C."),
            station: "Station C",
          },
        ]),
        station: "Station C",
      }),
    );
    const view = renderChat("Station C", 1);

    await waitFor(() =>
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("1"),
    );

    fetchMock.mockResolvedValue(
      answer(200, {
        ...thread([
          {
            ...message(2, "CONTROL_ROOM", "Nyt scenarie."),
            activationId: 2,
          },
        ]),
        activationId: 2,
      }),
    );
    view.rerender(
      <StationChat
        token={token}
        station="Station B"
        activationId={2}
        closedReason="Du er ikke længere tjekket ind på stationen."
        onClosedByServer={onClosedByServer}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("1"),
    );
  });

  it("does not show the note again when a dismissed unread message is read on reconnect", async () => {
    jest.useFakeTimers();
    try {
      const reply = message(5, "CONTROL_ROOM", "Vi sender hjælp.");
      fetchMock.mockResolvedValue(answer(200, thread([reply])));
      renderChat("Station B");

      await waitFor(() =>
        expect(screen.getByTestId("message-notice")).toBeTruthy(),
      );
      await act(async () => {
        jest.advanceTimersByTime(motion.messageNoticeMs);
      });
      expect(screen.queryByTestId("message-notice")).toBeNull();
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("1");

      await act(async () => {
        emit("connect", undefined);
      });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      await act(async () => {});

      expect(screen.queryByTestId("message-notice")).toBeNull();
      expect(
        screen.getByTestId("chat-unread", { includeHiddenElements: true }),
      ).toHaveTextContent("1");
    } finally {
      jest.useRealTimers();
    }
  });
});
