import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { colors, messageSymbols, palette } from "../../../shared/Theme";
import type { LineGroup } from "../../../shared/auth/line-groups";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
import { useLiveData } from "../data/liveData";
import { useStationThreads } from "../data/useStationThreads";
import { ApiError } from "../get-json";
import { notificationTestShortcuts } from "../local-settings";
import { stationMessageError } from "../station-threads";
import { NotificationBadge } from "./NotificationBadge";

const MAX_MESSAGE_LENGTH = 1000;
const messageColors = {
  "--message-background": colors.background,
  "--message-ink": colors.text,
  "--message-divider": colors.subtleBorder,
  "--message-selected": colors.page,
  "--message-attention": colors.statusYellow,
  "--message-error": colors.statusRedBorder,
  "--message-station": colors.statusRed,
  "--message-action": palette.metroLineFour,
} as CSSProperties;
const writtenTime = new Intl.DateTimeFormat("da-DK", { timeStyle: "short" });
const writtenDateTime = new Intl.DateTimeFormat("da-DK", {
  dateStyle: "short",
  timeStyle: "short",
});
const noMessages: StationMessage[] = [];

export function OperatorMessagePanel({
  token,
  lineGroup,
  testNotificationCount,
}: {
  token: string;
  lineGroup: LineGroup | null;
  testNotificationCount?: number;
}) {
  const { activations } = useLiveData();
  const activation = activations.find(
    (active) => active.lineGroup === lineGroup,
  );
  const [latest, setLatest] = useState(activation);
  if (activation && activation !== latest) setLatest(activation);
  const scenario = activation ?? latest;

  return (
    <div className="operator-messages" style={messageColors}>
      <ActiveMessages
        key={scenario?.activationId}
        token={token}
        activation={scenario}
        active={activation !== undefined}
        testNotificationCount={testNotificationCount}
      />
    </div>
  );
}

function ActiveMessages({
  token,
  activation,
  active,
  testNotificationCount,
}: {
  token: string;
  activation: ScenarioState | undefined;
  active: boolean;
  testNotificationCount?: number;
}) {
  const { isConnected } = useLiveData();
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [readIds, setReadIds] = useState(() => new Set<number>());
  const [pinned, setPinned] = useState(() => new Map<number, StationMessage>());
  const [testThreads, setTestThreads] = useState<
    Record<string, StationMessage[]>
  >({});
  const nextTestIdRef = useRef(0);
  const testing = Object.keys(testThreads).length > 0;
  const activationId = activation?.activationId;
  const deployments = activation?.deployments;
  const stations = [...new Set(deployments?.map(({ fulfills }) => fulfills))];
  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const {
    history,
    threads,
    thread,
    listError,
    threadError,
    closed,
    reload,
    send,
  } = useStationThreads(
    token,
    active && !testing ? (activationId ?? null) : null,
    showSaved ? null : station,
  );
  const readOnly = !active || closed;

  useEffect(() => {
    if (!notificationTestShortcuts || !active || activationId === undefined)
      return;

    function addTestMessages(event: KeyboardEvent) {
      if (
        !event.ctrlKey ||
        !event.altKey ||
        event.shiftKey ||
        event.metaKey ||
        (event.key !== "," && event.code !== "Comma")
      )
        return;
      event.preventDefault();
      if (event.repeat || activationId === undefined) return;

      const writtenAt = new Date().toISOString();
      const messages = [
        ...new Set(deployments?.map(({ fulfills }) => fulfills)),
      ].map((station): StationMessage => {
        const id = --nextTestIdRef.current;
        return {
          id,
          activationId,
          station,
          clientMessageId: `test-${id}`,
          sender: "STATION",
          text: "Hello World!",
          writtenAt,
          receivedAt: writtenAt,
        };
      });
      setTestThreads((current) => ({
        ...current,
        ...Object.fromEntries(
          messages.map((message) => [
            message.station,
            [...(current[message.station] ?? []), message],
          ]),
        ),
      }));
    }

    window.addEventListener("keydown", addTestMessages);
    return () => window.removeEventListener("keydown", addTestMessages);
  }, [active, activationId, deployments]);

  function messagesFor(name: string) {
    return testing
      ? (testThreads[name] ?? noMessages)
      : (history[name]?.messages ??
          (thread?.station === name ? thread.messages : undefined));
  }

  const shownMessages = station ? messagesFor(station) : undefined;
  // Only messages in the visible conversation are acknowledged. This also
  // covers messages arriving after the operator opens the conversation.
  if (
    open &&
    !showSaved &&
    shownMessages?.some(
      ({ id, sender }) => sender === "STATION" && !readIds.has(id),
    )
  ) {
    setReadIds(
      new Set([
        ...readIds,
        ...shownMessages
          .filter(({ sender }) => sender === "STATION")
          .map(({ id }) => id),
      ]),
    );
  }

  const stationChats = [
    ...new Set([
      ...(testing
        ? Object.keys(testThreads)
        : (threads?.map(({ station }) => station) ?? [])),
      ...stations,
    ]),
  ]
    .map((name) => ({
      name,
      unread: (messagesFor(name) ?? noMessages).filter(
        ({ id, sender }) => sender === "STATION" && !readIds.has(id),
      ).length,
    }))
    .sort((a, b) => b.unread - a.unread);
  const stationUnreadCount = stationChats.reduce(
    (total, chat) => total + chat.unread,
    0,
  );
  const unreadCount = testing
    ? stationUnreadCount
    : (testNotificationCount ?? stationUnreadCount);
  const savedMessages = [...pinned.values()]
    .filter(({ id, sender }) => sender === "STATION" && id < 0 === testing)
    .sort((a, b) => Date.parse(a.writtenAt) - Date.parse(b.writtenAt));
  const shownListError = testing ? null : listError;
  const shownThreadError = testing || showSaved ? null : threadError;

  function togglePin(message: StationMessage) {
    setPinned((current) => {
      const next = new Map(current);
      if (next.has(message.id)) next.delete(message.id);
      else next.set(message.id, message);
      return next;
    });
  }

  async function sendMessage(name: string, request: StationMessageRequest) {
    if (!testing) return send(name, request);

    const message: StationMessage = {
      ...request,
      id: --nextTestIdRef.current,
      station: name,
      sender: "CONTROL_ROOM",
      receivedAt: request.writtenAt,
    };
    setTestThreads((current) => ({
      ...current,
      [name]: [...(current[name] ?? []), message],
    }));
    return message;
  }

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="operator-message-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          unreadCount ? `Beskeder, ${unreadCount} ulæste beskeder` : "Beskeder"
        }
        onClick={() => (open ? close() : setOpen(true))}
      >
        Beskeder
        <NotificationBadge count={unreadCount} />
      </button>
      <section
        id={panelId}
        className="operator-message-panel"
        aria-labelledby={`${panelId}-title`}
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <header>
          <h2 id={`${panelId}-title`}>Stationsbeskeder</h2>
          <button ref={closeButtonRef} type="button" onClick={close}>
            Luk
          </button>
        </header>
        {!readOnly && !testing && !isConnected && (
          <p role="status">
            Forbindelsen er afbrudt. Beskederne kan være forældede.
          </p>
        )}
        <div className="operator-message-body">
          <nav className="operator-thread-list" aria-label="Stationssamtaler">
            <div className="operator-saved-toolbar">
              <button
                type="button"
                aria-pressed={showSaved}
                onClick={() => setShowSaved((current) => !current)}
              >
                Gemt <span aria-hidden="true">{messageSymbols.pin}</span>
              </button>
            </div>
            {shownListError && (
              <p role="alert">
                Kunne ikke hente samtaler. {shownListError}{" "}
                <button type="button" onClick={reload}>
                  Prøv igen
                </button>
              </p>
            )}
            <ul aria-label="Stationssamtaler">
              {stationChats.map(({ name, unread }) => (
                <li key={name}>
                  <button
                    type="button"
                    aria-pressed={!showSaved && station === name}
                    onClick={() => {
                      setStation(name);
                      setShowSaved(false);
                    }}
                  >
                    <strong>{name}</strong>
                    {unread > 0 && (
                      <span className="station-thread-unread">
                        {unread} ulæst
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="operator-thread">
            {showSaved ? (
              <>
                <h3>Gemte beskeder</h3>
                <MessageHistory
                  key="saved"
                  label="Gemte beskeder"
                  messages={savedMessages}
                  pinned={pinned}
                  onPin={togglePin}
                  saved
                  visible={open}
                />
              </>
            ) : station && activationId !== undefined ? (
              <>
                <h3>{station}</h3>
                {shownThreadError && (
                  <p role="alert">
                    Kunne ikke hente beskeder. {shownThreadError}{" "}
                    <button type="button" onClick={reload}>
                      Prøv igen
                    </button>
                  </p>
                )}
                {shownMessages ? (
                  <MessageHistory
                    key={station}
                    label={`Beskeder med ${station}`}
                    messages={shownMessages}
                    pinned={pinned}
                    onPin={togglePin}
                    visible={open}
                  />
                ) : (
                  !shownThreadError && (
                    <p>
                      {readOnly
                        ? "Beskederne er ikke hentet."
                        : "Henter beskeder."}
                    </p>
                  )
                )}
                {!readOnly && (
                  <MessageComposer
                    key={`${testing}:${station}`}
                    station={station}
                    activationId={activationId}
                    canSend={testing || isConnected}
                    send={sendMessage}
                  />
                )}
              </>
            ) : (
              <p>
                {readOnly
                  ? "Vælg en samtale for at læse beskeder."
                  : "Vælg en station for at skrive eller læse beskeder."}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function MessageHistory({
  label,
  messages,
  pinned,
  onPin,
  saved = false,
  visible,
}: {
  label: string;
  messages: StationMessage[];
  pinned: ReadonlyMap<number, StationMessage>;
  onPin: (message: StationMessage) => void;
  saved?: boolean;
  visible: boolean;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!saved && visible && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, saved, visible]);

  if (messages.length === 0) {
    return <p>{saved ? "Ingen gemte beskeder." : "Ingen beskeder endnu."}</p>;
  }

  return (
    <ol ref={listRef} aria-label={label} aria-live="polite">
      {messages.map((message) => {
        const { id, sender, station, text, writtenAt } = message;
        const outgoing = sender === "CONTROL_ROOM";
        const isPinned = pinned.has(id);
        const time = new Date(writtenAt);
        return (
          <li
            key={id}
            className={
              outgoing ? "operator-chat-outgoing" : "operator-chat-incoming"
            }
          >
            <div className="operator-chat-message">
              <strong>{outgoing ? "Kontrolrum" : station}</strong>
              <div className="operator-chat-bubble">
                <p>{text}</p>
                {!outgoing && (
                  <button
                    type="button"
                    className="operator-message-pin"
                    aria-label={`Gem besked fra ${station} kl. ${writtenTime.format(time)}`}
                    title={isPinned ? "Fjern fra gemte beskeder" : "Gem besked"}
                    aria-pressed={isPinned}
                    onClick={() => onPin(message)}
                  >
                    <span aria-hidden="true">{messageSymbols.pin}</span>
                  </button>
                )}
              </div>
              <time dateTime={writtenAt} title={writtenDateTime.format(time)}>
                {saved
                  ? writtenDateTime.format(time)
                  : writtenTime.format(time)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MessageComposer({
  station,
  activationId,
  canSend,
  send,
}: {
  station: string;
  activationId: number;
  canSend: boolean;
  send: (
    station: string,
    request: StationMessageRequest,
  ) => Promise<StationMessage>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestRef = useRef<StationMessageRequest | null>(null);
  const tooLong = [...draft].length > MAX_MESSAGE_LENGTH;
  const ready = canSend && !sending && !tooLong && draft.trim() !== "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setSending(true);
    setError(null);
    try {
      const request = lastRequestRef.current ?? {
        activationId,
        clientMessageId: crypto.randomUUID(),
        text: draft,
        writtenAt: new Date().toISOString(),
      };
      lastRequestRef.current = request;
      await send(station, request);
      lastRequestRef.current = null;
      setDraft("");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 409)) {
        lastRequestRef.current = null;
      }
      setError(stationMessageError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <textarea
        aria-label={`Besked til ${station}`}
        aria-invalid={tooLong}
        placeholder={`Skriv til ${station}…`}
        rows={1}
        value={draft}
        disabled={sending}
        onChange={(event) => {
          lastRequestRef.current = null;
          setError(null);
          setDraft(event.target.value);
        }}
      />
      <button type="submit" disabled={!ready}>
        {sending ? "Sender…" : "Send"}
      </button>
      {tooLong && (
        <p role="alert">Beskeden må højst fylde {MAX_MESSAGE_LENGTH} tegn.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
