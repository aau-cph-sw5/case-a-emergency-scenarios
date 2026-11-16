import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { colors, palette } from "../../../shared/Theme";
import type { LineGroup } from "../../../shared/auth/line-groups";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
import { useLiveData } from "../data/liveData";
import { useStationThreads } from "../data/useStationThreads";
import { ApiError } from "../get-json";
import { stationMessageError } from "../station-threads";

const MAX_MESSAGE_LENGTH = 1000;
const messageColors = {
  "--message-background": colors.background,
  "--message-ink": colors.text,
  "--message-divider": colors.subtleBorder,
  "--message-selected": colors.page,
  "--message-attention": colors.statusYellow,
  "--message-error": palette.metroDeepRed,
} as CSSProperties;
const writtenTime = new Intl.DateTimeFormat("da-DK", {
  dateStyle: "short",
  timeStyle: "short",
});

export function OperatorMessagePanel({
  token,
  lineGroup,
}: {
  token: string;
  lineGroup: LineGroup | null;
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
      />
    </div>
  );
}

function ActiveMessages({
  token,
  activation,
  active,
}: {
  token: string;
  activation: ScenarioState | undefined;
  active: boolean;
}) {
  const { isConnected } = useLiveData();
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState("");
  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { threads, thread, listError, threadError, closed, reload, send } =
    useStationThreads(
      token,
      active ? (activation?.activationId ?? null) : null,
      station || null,
    );
  const readOnly = !active || closed;
  const stations = [
    ...new Set(activation?.deployments.map(({ fulfills }) => fulfills)),
  ];
  const unanswered = readOnly
    ? 0
    : (threads?.filter(({ state }) => state === "UNANSWERED").length ?? 0);
  const visible = open;

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
        onClick={() => (visible ? close() : setOpen(true))}
      >
        Beskeder
        {unanswered > 0 && (
          <span className="station-thread-unanswered">
            {" "}
            · {unanswered} ubesvaret
          </span>
        )}
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
          {(readOnly || !isConnected) && (
            <p role="status">
              {readOnly
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
              {listError ? (
                <p role="alert">
                  Kunne ikke hente tråde. {listError}{" "}
                  <button type="button" onClick={reload}>
                    Prøv igen
                  </button>
                </p>
              ) : threads === null ? (
                <p>Henter tråde…</p>
              ) : threads.length === 0 ? (
                <p>Ingen samtaler endnu.</p>
              ) : null}
              <ul aria-label="Stationstråde">
                {threads?.map(({ station: name, state }) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-pressed={station === name}
                      onClick={() => setStation(name)}
                    >
                      <strong>{name}</strong>
                      <span
                        className={
                          state === "UNANSWERED"
                            ? "station-thread-unanswered"
                            : undefined
                        }
                      >
                        {state === "UNANSWERED" ? "Ubesvaret" : "Besvaret"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="operator-thread">
              {station && <h3>{station}</h3>}
              {threadError && (
                <p role="alert">
                  Kunne ikke hente beskeder. {threadError}{" "}
                  <button type="button" onClick={reload}>
                    Prøv igen
                  </button>
                </p>
              )}
              {thread && activation ? (
                <StationConversation
                  key={station}
                  station={station}
                  activationId={activation.activationId}
                  messages={thread.messages ?? []}
                  canSend={isConnected}
                  readOnly={readOnly}
                  visible={visible}
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
                      : !threadError && "Henter beskeder…"}
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
  canSend,
  readOnly,
  visible,
  send,
}: {
  station: string;
  activationId: number;
  messages: StationMessage[];
  canSend: boolean;
  readOnly: boolean;
  visible: boolean;
  send: (
    station: string,
    request: StationMessageRequest,
  ) => Promise<StationMessage>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestRef = useRef<StationMessageRequest | null>(null);
  const historyRef = useRef<HTMLOListElement>(null);
  const lastMessageId = messages.at(-1)?.id;
  const tooLong = [...draft].length > MAX_MESSAGE_LENGTH;
  const ready =
    !readOnly && canSend && !sending && !tooLong && draft.trim() !== "";

  useEffect(() => {
    if (visible && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [visible, lastMessageId]);

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
        <ol
          ref={historyRef}
          aria-label={`Beskeder med ${station}`}
          aria-live="polite"
        >
          {messages.map((message) => (
            <li key={message.id}>
              <strong>
                {message.sender === "STATION" ? station : "Kontrolrum"}
              </strong>
              <time dateTime={message.writtenAt}>
                {writtenTime.format(new Date(message.writtenAt))}
              </time>
              <p>{message.text}</p>
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
