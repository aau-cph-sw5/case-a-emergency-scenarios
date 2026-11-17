import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { colors, palette, replyArrow } from "../../../shared/Theme";
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
  "--message-error": colors.statusRed,
  "--message-checkmark": colors.statusRed,
  "--message-reply": palette.metroLineFour,
} as CSSProperties;
const writtenTime = new Intl.DateTimeFormat("da-DK", {
  dateStyle: "short",
  timeStyle: "short",
});

type ConversationMessage = Pick<
  StationMessage,
  "id" | "sender" | "text" | "writtenAt"
>;

function getUnreadIds(
  messages: ConversationMessage[],
  marks: ReadonlyMap<number, boolean> | undefined,
) {
  const lastReplyId = messages.reduce(
    (replyId, message) =>
      message.sender === "CONTROL_ROOM" ? message.id : replyId,
    0,
  );
  return new Set(
    messages
      .filter(
        (message) =>
          message.sender === "STATION" &&
          !(
            marks?.get(message.id) ??
            (lastReplyId !== 0 && message.id < lastReplyId)
          ),
      )
      .map(({ id }) => id),
  );
}

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
  const [station, setStation] = useState("");
  const [testMessages, setTestMessages] = useState<string[]>([]);
  const [readMarks, setReadMarks] = useState(
    () => new Map<string, Map<number, boolean>>(),
  );
  const testingMessages = testMessages.length > 0;
  const hasScenario = activation !== undefined;
  useEffect(() => {
    if (!notificationTestShortcuts || !hasScenario) return;

    function addTestMessages(event: KeyboardEvent) {
      if (
        !event.ctrlKey ||
        !event.altKey ||
        event.shiftKey ||
        event.metaKey ||
        event.key !== ","
      )
        return;
      event.preventDefault();
      if (event.repeat) return;
      const writtenAt = new Date().toISOString();
      setTestMessages((messages) => [...messages, writtenAt]);
    }

    window.addEventListener("keydown", addTestMessages);
    return () => window.removeEventListener("keydown", addTestMessages);
  }, [hasScenario]);
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
    active && !testingMessages ? (activation?.activationId ?? null) : null,
    station || null,
  );
  const readOnly = !active || closed;
  const stations = [
    ...new Set(activation?.deployments.map(({ fulfills }) => fulfills)),
  ];
  const testConversation = testMessages.map((writtenAt, index) => ({
    id: -(index + 1),
    sender: "STATION" as const,
    text: "Hello World!",
    writtenAt,
  }));

  function messagesFor(name: string) {
    if (testingMessages) return testConversation;
    return (
      history[name]?.messages ??
      (thread?.station === name ? thread.messages : undefined)
    );
  }

  const names = testingMessages
    ? stations
    : threads?.map(({ station }) => station);
  const shownThreads = names
    ?.map((name) => {
      const messages = messagesFor(name) ?? [];
      const unreadIds = getUnreadIds(messages, readMarks.get(name));
      const oldestUnread = messages.reduce(
        (oldest, message) =>
          unreadIds.has(message.id)
            ? Math.min(oldest, Date.parse(message.writtenAt))
            : oldest,
        Infinity,
      );
      return { name, unreadIds, oldestUnread };
    })
    .sort((a, b) => a.oldestUnread - b.oldestUnread);
  const shownMessages = messagesFor(station);
  const unreadIds = getUnreadIds(shownMessages ?? [], readMarks.get(station));
  const shownListError = testingMessages ? null : listError;
  const shownThreadError = testingMessages ? null : threadError;
  const unreadCount =
    testNotificationCount ??
    shownThreads?.reduce((total, entry) => total + entry.unreadIds.size, 0) ??
    0;
  const visible = open;

  function markRead(id: number, read: boolean) {
    setReadMarks((current) => {
      const marks = new Map(current.get(station));
      marks.set(id, read);
      return new Map(current).set(station, marks);
    });
  }

  useEffect(() => {
    if (visible) closeButtonRef.current?.focus();
  }, [visible]);

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
        aria-expanded={visible}
        aria-controls={panelId}
        aria-label={
          unreadCount ? `Beskeder, ${unreadCount} ulæste beskeder` : "Beskeder"
        }
        onClick={() => (visible ? close() : setOpen(true))}
      >
        Beskeder
        <NotificationBadge count={unreadCount} />
      </button>
      {
        <section
          id={panelId}
          className="operator-message-panel"
          aria-labelledby={`${panelId}-title`}
          hidden={!visible}
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
          {(testingMessages || readOnly || !isConnected) && (
            <p role="status">
              {testingMessages
                ? "Testbeskeder"
                : readOnly
                  ? "Intet aktivt scenarie. Du kan læse tidligere hentede beskeder her."
                  : "Forbindelsen er afbrudt. Beskederne kan være forældede."}
            </p>
          )}
          <div className="operator-message-body">
            <div className="operator-thread-list">
              {!readOnly && (
                <>
                  <label htmlFor={`${panelId}-station`}>Vælg station</label>
                  <select
                    id={`${panelId}-station`}
                    value={station}
                    onChange={(event) => setStation(event.target.value)}
                  >
                    <option value="">Vælg en station</option>
                    {stations.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </>
              )}
              {shownListError ? (
                <p role="alert">
                  Kunne ikke hente tråde. {shownListError}{" "}
                  <button type="button" onClick={reload}>
                    Prøv igen
                  </button>
                </p>
              ) : shownThreads === undefined ? (
                <p>Henter tråde…</p>
              ) : shownThreads.length === 0 ? (
                <p>Ingen samtaler endnu.</p>
              ) : null}
              <ul aria-label="Stationstråde">
                {shownThreads?.map(({ name, unreadIds }) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-pressed={station === name}
                      onClick={() => setStation(name)}
                    >
                      <strong>{name}</strong>
                      <span
                        className={
                          unreadIds.size > 0
                            ? "station-thread-unanswered"
                            : undefined
                        }
                      >
                        {unreadIds.size > 0
                          ? `${unreadIds.size} ulæst`
                          : "Læst"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="operator-thread">
              {station && <h3>{station}</h3>}
              {shownThreadError && (
                <p role="alert">
                  Kunne ikke hente beskeder. {shownThreadError}{" "}
                  <button type="button" onClick={reload}>
                    Prøv igen
                  </button>
                </p>
              )}
              {station && shownMessages && activation ? (
                <StationConversation
                  key={station}
                  station={station}
                  activationId={activation.activationId}
                  messages={shownMessages}
                  unreadIds={unreadIds}
                  onMarkRead={markRead}
                  canSend={isConnected}
                  readOnly={readOnly || testingMessages}
                  send={send}
                />
              ) : (
                <p>
                  {!station
                    ? readOnly
                      ? "Vælg en samtale for at læse beskeder."
                      : "Vælg en station for at skrive eller læse beskeder."
                    : readOnly
                      ? "Beskederne er ikke hentet."
                      : !shownThreadError && "Henter beskeder…"}
                </p>
              )}
            </div>
          </div>
        </section>
      }
    </>
  );
}

function StationConversation({
  station,
  activationId,
  messages,
  unreadIds,
  onMarkRead,
  canSend,
  readOnly,
  send,
}: {
  station: string;
  activationId: number;
  messages: ConversationMessage[];
  unreadIds: ReadonlySet<number>;
  onMarkRead: (id: number, read: boolean) => void;
  canSend: boolean;
  readOnly: boolean;
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
  const ready =
    !readOnly && canSend && !sending && !tooLong && draft.trim() !== "";

  const ordered = [...messages].sort(
    (a, b) =>
      Number(unreadIds.has(b.id)) - Number(unreadIds.has(a.id)) ||
      Date.parse(a.writtenAt) - Date.parse(b.writtenAt),
  );

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
    <>
      {messages.length === 0 ? (
        <p>Ingen beskeder endnu.</p>
      ) : (
        <ol aria-label={`Beskeder med ${station}`} aria-live="polite">
          {ordered.map((message) => (
            <li
              key={message.id}
              className={
                unreadIds.has(message.id) ? undefined : "operator-message-read"
              }
            >
              <div>
                <strong>
                  {message.sender === "STATION" ? station : "Kontrolrum"}
                </strong>
                <time dateTime={message.writtenAt}>
                  {writtenTime.format(new Date(message.writtenAt))}
                </time>
                <p>{message.text}</p>
              </div>
              <div className="operator-message-actions">
                {message.sender === "STATION" && (
                  <button
                    type="button"
                    className="operator-message-reply"
                    aria-label="Svar på besked"
                  >
                    <span aria-hidden="true">{replyArrow}</span>
                  </button>
                )}
                <input
                  type="checkbox"
                  className="operator-message-checkbox"
                  aria-label={`Marker besked fra ${message.sender === "STATION" ? station : "kontrolrummet"} kl. ${writtenTime.format(new Date(message.writtenAt))} som læst`}
                  checked={!unreadIds.has(message.id)}
                  disabled={message.sender === "CONTROL_ROOM"}
                  onChange={(event) =>
                    onMarkRead(message.id, event.target.checked)
                  }
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      {!readOnly && (
        <form onSubmit={(event) => void submit(event)}>
          <textarea
            aria-label={`Besked til ${station}`}
            aria-invalid={tooLong}
            placeholder={`Skriv til ${station}`}
            rows={2}
            value={draft}
            disabled={sending}
            onChange={(event) => {
              lastRequestRef.current = null;
              setError(null);
              setDraft(event.target.value);
            }}
          />
          {tooLong && (
            <p role="alert">
              Beskeden må højst fylde {MAX_MESSAGE_LENGTH} tegn.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={!ready}>
            {sending ? "Sender…" : "Send besked"}
          </button>
        </form>
      )}
    </>
  );
}
