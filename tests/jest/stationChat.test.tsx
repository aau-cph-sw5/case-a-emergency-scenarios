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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ERROR_CODES } from "../../shared/error-codes";
import type { StationMessage } from "../../shared/types/v1/station-message";
import { StationChat } from "../../mobile/src/screens/StationChat";

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

function emit(name: string, event: unknown) {
  for (const listener of mockListeners.get(name) ?? []) listener(event);
}

function message(
  id: number,
  sender: StationMessage["sender"],
  text: string,
  writtenAt = "2026-11-17T08:20:00",
): StationMessage {
  return {
    id,
    clientMessageId: `client-${id}`,
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

const thread = (messages: StationMessage[]) => ({
  activationId: 1,
  station: "Station B",
  state: "ANSWERED",
  unansweredSince: null,
  lastMessageAt: null,
  messages,
});

const onClosedByServer = jest.fn();

// A token with a user id, so the chat can remember the steward's own messages.
const payload = Buffer.from(JSON.stringify({ userId: 7 })).toString(
  "base64url",
);
const token = `header.${payload}.signature`;

function renderChat(station: string | undefined) {
  return render(
    <StationChat
      token={token}
      station={station}
      activationId={1}
      closedReason="Du er ikke længere tjekket ind på stationen."
      onClosedByServer={onClosedByServer}
    />,
  );
}

async function openChat() {
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Åbn chat med kontrolrummet"));
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
          message(2, "CONTROL_ROOM", "Modtaget.", "2026-11-17T08:25:00"),
          message(1, "STATION", "Elevatoren er ude af drift."),
        ]),
      ),
    );
    renderChat("Station B");

    await openChat();

    expect(await screen.findByText("Modtaget.")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Station, en kollega, 08:20: Elevatoren er ude af drift.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Kontrolrum, 08:25: Modtaget.")).toBeTruthy();
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
      screen.getByLabelText("Kontrolrum, 08:20: Vi sender en mere."),
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
      await screen.findByLabelText("Station, dig, 08:20: Fra mig."),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Station, en kollega, 08:20: Fra en kollega."),
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
    await screen.findByLabelText("Station, dig, 08:20: Fra mig.");
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
      await screen.findByLabelText("Station, dig, 08:20: Fra mig."),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Station, en kollega, 08:20: Fra en kollega."),
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

  it("sends a message that did not get through again with the same id and time", async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, thread([])))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(answer(201, message(7, "STATION", "Hej.")));
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
    expect(
      await screen.findByText("Ikke sendt. Ingen forbindelse til serveren."),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("Send igen"));
    });

    const first = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    const second = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(second).toEqual(first);
    await waitFor(() => expect(screen.queryByText(/Ikke sendt/)).toBeNull());
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
      emit("station-message", { message: reply, thread: {}, sentAt: "" });
      emit("station-message", { message: reply, thread: {}, sentAt: "" });
      // Another station's message is not this thread's.
      emit("station-message", {
        message: { ...message(3, "CONTROL_ROOM", "Andet."), station: "X" },
        thread: {},
        sentAt: "",
      });
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
        token="token"
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
    fetchMock.mockResolvedValue(answer(200, thread([])));
    renderChat("Station B");
    await openChat();

    await act(async () => {
      emit("station-threads-closed", { activationId: 1, sentAt: "" });
    });

    expect(screen.getByText("Chatten er lukket")).toBeTruthy();
    expect(screen.getByText("Scenariet er afsluttet.")).toBeTruthy();
    expect(onClosedByServer).toHaveBeenCalled();
  });
});
