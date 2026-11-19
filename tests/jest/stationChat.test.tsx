import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

function renderChat(station: string | undefined) {
  return render(
    <StationChat
      token="token"
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

beforeEach(() => {
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
      screen.getByLabelText("Station, 08:20: Elevatoren er ude af drift."),
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
        token="token"
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
