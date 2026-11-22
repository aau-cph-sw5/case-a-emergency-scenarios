import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { FormatError } from "../../../shared/api/http";
import { colors, messageSymbols, palette } from "../../../shared/Theme";
import type { LineGroup } from "../../../shared/auth/line-groups";
import { userIdFromToken } from "../../../shared/auth/login";
import {
  isSendableText,
  MAX_MESSAGE_LENGTH,
  messageLength,
} from "../../../shared/station-messages/validate";
import {
  clearMessageSession,
  loadMessageSession,
  saveMessageSession,
} from "../auth/message-session";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
import { useLiveData } from "../data/liveData";
import { useStationThreads } from "../data/useStationThreads";
import { ApiError } from "../get-json";
import { notificationTestShortcuts } from "../local-settings";
import { stationMessageError } from "../station-threads";
import { NotificationBadge } from "./NotificationBadge";

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
const emptyPins: ReadonlyMap<number, StationMessage> = new Map();

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
  const userId = userIdFromToken(token);
  const storageKey =
    userId && activation
      ? `metro-station-messages:${encodeURIComponent(userId)}:${activation.activationId}`
      : null;

  // Keep panel open state in the outer shell so stand-down never slams an open
  // panel shut while the operator reads the closed state.
  const [open, setOpen] = useState(false);

  // Clear the closed or replaced activation's sessionStorage entry for the
  // same operator, whether stand-down or a direct scenario switch happened.
  const previousSessionRef = useRef<{
    userId: string;
    storageKey: string;
  } | null>(null);
  useEffect(() => {
    const previous = previousSessionRef.current;
    if (
      previous &&
      previous.userId === userId &&
      previous.storageKey !== storageKey
    ) {
      clearMessageSession(previous.storageKey);
    }
    previousSessionRef.current =
      userId && storageKey ? { userId, storageKey } : null;
  }, [userId, storageKey]);

  const shellProps = {
    open,
    onToggle: () => setOpen((current) => !current),
    onClose: () => setOpen(false),
  };

  return (
    <div className="operator-messages" style={messageColors}>
      {activation ? (
        <ActiveMessages
          key={storageKey ?? `${token}:${activation.activationId}`}
          token={token}
          storageKey={storageKey}
          activation={activation}
          testNotificationCount={testNotificationCount}
          shell={shellProps}
        />
      ) : (
        <ClosedPanel shell={shellProps} notice="Intet aktivt scenarie." />
      )}
    </div>
  );
}

type ShellProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

function MessagePanelShell({
  shell,
  unreadCount,
  children,
}: {
  shell: ShellProps;
  unreadCount: number;
  children: ReactNode;
}) {
  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (shell.open) closeButtonRef.current?.focus();
  }, [shell.open]);

  function close() {
    shell.onClose();
    launcherRef.current?.focus();
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="operator-message-button"
        aria-expanded={shell.open}
        aria-controls={panelId}
        aria-label={
          unreadCount ? `Beskeder, ${unreadCount} ulæste beskeder` : "Beskeder"
        }
        onClick={() => (shell.open ? close() : shell.onToggle())}
      >
        Beskeder
        <NotificationBadge count={unreadCount} />
      </button>
      <section
        id={panelId}
        className="operator-message-panel"
        aria-labelledby={`${panelId}-title`}
        hidden={!shell.open}
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
        {children}
      </section>
    </>
  );
}

function ClosedPanel({ shell, notice }: { shell: ShellProps; notice: string }) {
  const [showSaved, setShowSaved] = useState(false);

  return (
    <MessagePanelShell shell={shell} unreadCount={0}>
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
          <ul aria-label="Stationssamtaler" />
        </nav>
        <div className="operator-thread">
          {showSaved ? (
            <>
              <h3>Gemte beskeder</h3>
              <MessageHistory
                key="saved"
                label="Gemte beskeder"
                messages={noMessages}
                pinned={emptyPins}
                onPin={() => undefined}
                saved
                visible={shell.open}
              />
            </>
          ) : (
            <p>{notice}</p>
          )}
        </div>
      </div>
    </MessagePanelShell>
  );
}

function ActiveMessages({
  token,
  storageKey,
  activation,
  testNotificationCount,
  shell,
}: {
  token: string;
  storageKey: string | null;
  activation: ScenarioState;
  testNotificationCount?: number;
  shell: ShellProps;
}) {
  const { isConnected } = useLiveData();
  const [station, setStation] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [messageState, setMessageState] = useState(() =>
    loadMessageSession(storageKey, activation.activationId),
  );
  const [testThreads, setTestThreads] = useState<
    Record<string, StationMessage[]>
  >({});
  const nextTestIdRef = useRef(0);
  const testing = Object.keys(testThreads).length > 0;
  const { activationId, deployments } = activation;
  const { threads, thread, listError, threadError, closed, reload, send } =
    useStationThreads(
      token,
      !testing ? activationId : null,
      shell.open && !showSaved ? station : null,
    );

  const { readIds, pinned } = messageState;
  useEffect(() => {
    if (closed) {
      clearMessageSession(storageKey);
      return;
    }
    saveMessageSession(storageKey, readIds, pinned);
  }, [closed, storageKey, readIds, pinned]);

  const stations = [...new Set(deployments?.map(({ fulfills }) => fulfills))];

  useEffect(() => {
    if (!notificationTestShortcuts || closed) return;

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
      if (event.repeat) return;

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
  }, [closed, activationId, deployments]);

  if (closed) {
    return (
      <ClosedPanel
        shell={shell}
        notice="Scenariet er afsluttet. Samtalerne er lukket."
      />
    );
  }

  function messagesFor(name: string) {
    return testing
      ? (testThreads[name] ?? noMessages)
      : thread?.station === name
        ? thread.messages
        : undefined;
  }

  const shownMessages = station ? messagesFor(station) : undefined;
  // Only messages in the visible conversation are acknowledged. This also
  // covers messages arriving after the operator opens the conversation.
  if (
    shell.open &&
    !showSaved &&
    shownMessages?.some(
      ({ id, sender }) => sender === "STATION" && !readIds.has(id),
    )
  ) {
    setMessageState((current) => ({
      ...current,
      readIds: new Set([
        ...current.readIds,
        ...shownMessages
          .filter(({ sender }) => sender === "STATION")
          .map(({ id }) => id),
      ]),
    }));
  }

  const stationChats = [
    ...new Set([
      ...(testing
        ? Object.keys(testThreads)
        : (threads?.map(({ station }) => station) ?? [])),
      ...stations,
    ]),
  ]
    .map((name) => {
      const summary = threads?.find((entry) => entry.station === name);
      const messages = testThreads[name] ?? noMessages;
      const ids = testing
        ? messages
            .filter(({ sender }) => sender === "STATION")
            .map(({ id }) => id)
        : (summary?.stationMessageIds ?? []);
      const lastMessageAt = testing
        ? messages.at(-1)?.receivedAt
        : summary?.lastMessageAt;
      return {
        name,
        unread: ids.filter((id) => !readIds.has(id)).length,
        lastMessageAt: lastMessageAt ? Date.parse(lastMessageAt) : 0,
      };
    })
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
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
    setMessageState((current) => {
      const next = new Map(current.pinned);
      if (next.has(message.id)) next.delete(message.id);
      else next.set(message.id, message);
      return { ...current, pinned: next };
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

  return (
    <MessagePanelShell shell={shell} unreadCount={unreadCount}>
      {!testing && !isConnected && (
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
                visible={shell.open}
              />
            </>
          ) : station ? (
            <>
              <h3>{station}</h3>
              {shownThreadError && (
                <p role="alert">
                  Kunne ikke hente beskeder. {shownThreadError} Luk og åbn
                  samtalen igen for at hente beskederne.{" "}
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
                  visible={shell.open}
                />
              ) : (
                !shownThreadError && <p>Henter beskeder.</p>
              )}
              <MessageComposer
                key={`${testing}:${station}`}
                station={station}
                activationId={activationId}
                canSend={testing || isConnected}
                send={sendMessage}
              />
            </>
          ) : (
            <p>Vælg en station for at skrive eller læse beskeder.</p>
          )}
        </div>
      </div>
    </MessagePanelShell>
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
  const tooLong = messageLength(draft) > MAX_MESSAGE_LENGTH;
  const ready = canSend && !sending && isSendableText(draft);

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
      if (
        e instanceof FormatError ||
        (e instanceof ApiError && (e.status === 400 || e.status === 409))
      ) {
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
