import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { QueuedStationMessage } from "../../../shared/offline/station-message-queue";
import type { StationMessageEvent } from "../../../shared/socket/events";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { StationThread } from "../../../shared/types/v1/station-thread";
import { colors, spacing, steward } from "../../../shared/Theme";
import { ChatClosedNotice, ChatHeader } from "../components/ChatHeader";
import { ChatTab } from "../components/ChatTab";
import {
  type Delivery,
  MessageBubble,
  WarningIcon,
} from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { MessageNotice } from "../components/MessageNotice";
import {
  closesThread,
  isSendableText,
  readStationThread,
  threadErrorMessage,
  type ThreadResult,
} from "../data/station-thread";
import { userIdFromToken } from "../../../shared/auth/login";
import {
  ownMessageIds,
  rememberOwnMessage,
} from "../offline/own-station-messages";
import { queueStationMessage } from "../offline/queue-station-message";
import {
  onStationMessagesChanged,
  stationMessageDelivery,
  stationMessageQueueStore,
} from "../offline/station-message-store";
import { socket } from "../socket";
import { useKeyboardPadding } from "../useKeyboardPadding";
import { useSlideInPanel } from "../useSlideInPanel";

// A message the steward wrote that the server has not stored, as it is in the
// phone's queue (MET-A-029, #336): waiting to be sent ("Afventer"), or refused
// for good with the reason ("Ikke sendt"). A message waiting goes out by
// itself when the phone is back online; a refused one is never sent again.
type OwnMessage = {
  clientMessageId: string;
  text: string;
  writtenAt: string;
  delivery: Delivery;
};

// The thread's messages with a new one added, each once, in the order the
// server received them (by id).
function merge(
  messages: StationMessage[],
  added: StationMessage[],
): StationMessage[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  for (const message of added) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// The station's chat with the control room (MET-A-029, #335): a black tab on
// the right edge of the steward's screen, and the chat that slides in from
// the right over the whole screen. The tab is there only while the steward is
// checked in at a station (station is set); a tap on it, or dragging it to
// the left, opens the chat. Swiping right, Luk or Android's back closes it.
//
// When the steward is no longer checked in (checked out, or the scenario was
// stood down) the tab goes. An open chat stays and says why it closed, so
// the screen does not vanish while the steward reads it.
export function StationChat({
  token,
  station,
  activationId,
  closedReason,
  onClosedByServer,
  onOpenChange,
}: {
  token: string;
  // The station the steward is checked in at; undefined when not checked in.
  station: string | undefined;
  activationId: number | undefined;
  // Why there is no chat, shown in a chat that was open when it closed.
  closedReason: string;
  // The server says the steward has no thread any more (checked out, stood
  // down), so the app's copy of the scenario is out of date.
  onClosedByServer: () => void;
  // Tells the view behind the chat that it is covered, so a screen reader
  // does not read it while the chat is open.
  onOpenChange?: (open: boolean) => void;
}) {
  const {
    open,
    shown,
    openPanel: openChat,
    closePanel: closeChat,
    tabDragHandlers,
    panelDragHandlers,
    translateX,
  } = useSlideInPanel(onOpenChange);
  const keyboardPadding = useKeyboardPadding();

  // The thread as the steward last saw it. It belongs to one station in one
  // activation, so it starts over when either changes.
  const threadKey =
    station === undefined || activationId === undefined
      ? undefined
      : `${activationId}/${station}`;
  const [shownThreadKey, setShownThreadKey] = useState(threadKey);
  // The station the chat was for, still named in a chat that has closed.
  const [lastStation, setLastStation] = useState(station);
  if (station !== undefined && station !== lastStation) setLastStation(station);
  const [messages, setMessages] = useState<StationMessage[]>([]);
  const [own, setOwn] = useState<OwnMessage[]>([]);
  // Whether the thread has been read since the chat showed this thread.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Set when the server closed the thread while the app still had a station.
  const [closedByServer, setClosedByServer] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Set when the phone could not save the message the steward sent, so the
  // text stays in the field and the steward can send it again.
  const [saveFailed, setSaveFailed] = useState(false);
  // A message being saved, so a second tap on Send does not save it twice.
  const savingRef = useRef(false);
  // The clientMessageIds of the messages this steward wrote on this phone, so
  // their messages can be told from colleagues' at the same station.
  const [mine, setMine] = useState<ReadonlySet<string>>(() => new Set());
  // How many messages from the control room the steward has not opened the
  // chat for yet (the badge on the tab), and the newest one's text for the
  // note at the top while it shows (#336).
  const [unread, setUnread] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const userId = userIdFromToken(token);
  if (threadKey !== shownThreadKey) {
    setShownThreadKey(threadKey);
    // The station going away keeps the old messages behind the closed
    // notice; a new station or activation starts empty.
    if (threadKey !== undefined) {
      setMessages([]);
      setOwn([]);
      setLoaded(false);
      setLoadError(null);
      setClosedByServer(null);
      setDraft("");
      setSaveFailed(false);
      setMine(new Set());
      setUnread(0);
      setNotice(null);
    }
  }

  // Opening the chat reads the new messages, so the badge and the note go.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  if (open && (unread > 0 || notice !== null)) {
    setUnread(0);
    setNotice(null);
  }

  useEffect(() => {
    if (
      userId === null ||
      activationId === undefined ||
      station === undefined
    ) {
      return;
    }
    let cancelled = false;
    void ownMessageIds(userId, activationId, station).then((ids) => {
      if (!cancelled) setMine((current) => new Set([...current, ...ids]));
    });
    return () => {
      cancelled = true;
    };
  }, [userId, activationId, station]);

  // A refusal that means there is no thread any more closes the chat.
  const closeByServer = useCallback(
    (reason: string) => {
      setClosedByServer(reason);
      onClosedByServer();
    },
    [onClosedByServer],
  );

  // The thread the chat shows now. An answer that comes back after the
  // station or activation changed belongs to the thread before, and is
  // dropped, so it cannot fill or close the new thread's chat.
  const currentThreadRef = useRef(threadKey);
  useEffect(() => {
    currentThreadRef.current = threadKey;
  }, [threadKey]);

  // Shows the thread read from the server: the earlier messages too, also
  // those written before the steward checked in.
  const showRead = useCallback(
    (result: ThreadResult<StationThread>) => {
      setLoaded(true);
      if (result.ok) {
        setLoadError(null);
        setMessages((current) => merge(current, result.value.messages ?? []));
      } else if (closesThread(result.code)) closeByServer(result.message);
      else setLoadError(result.message);
    },
    [closeByServer],
  );
  const load = useCallback(() => {
    if (station === undefined || threadKey === undefined) return;
    void readStationThread(token, station).then((result) => {
      if (currentThreadRef.current === threadKey) showRead(result);
    });
  }, [token, station, threadKey, showRead]);

  // Read when the chat opens, and again when the socket reconnects or the
  // app returns to the foreground, so a message missed meanwhile shows.
  useEffect(() => {
    if (!open || station === undefined) return;
    load();
    const onConnect = () => load();
    socket.on("connect", onConnect);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => {
      socket.off("connect", onConnect);
      subscription.remove();
    };
  }, [open, station, load]);

  // New messages and the thread closing arrive over the socket.
  useEffect(() => {
    if (station === undefined || activationId === undefined) return;
    const onMessage = (event: StationMessageEvent) => {
      if (
        event.message.station !== station ||
        event.message.activationId !== activationId
      ) {
        return;
      }
      setMessages((current) => merge(current, [event.message]));
      if (event.message.sender === "CONTROL_ROOM" && !openRef.current) {
        setUnread((count) => count + 1);
        setNotice(event.message.text);
      }
    };
    const onClosed = (event: { activationId: number }) => {
      if (event.activationId === activationId) {
        closeByServer("Scenariet er afsluttet.");
      }
    };
    socket.on("station-message", onMessage);
    socket.on("station-threads-closed", onClosed);
    return () => {
      socket.off("station-message", onMessage);
      socket.off("station-threads-closed", onClosed);
    };
  }, [station, activationId, closeByServer]);

  // The steward's own messages the server has not stored yet, read from the
  // phone's queue for this thread.
  const showOwn = useCallback(async () => {
    if (userId === null || station === undefined || activationId === undefined)
      return;
    const forThread = threadKey;
    const [pending, rejected] = await Promise.all([
      stationMessageQueueStore.getPending(userId),
      stationMessageQueueStore.getRejected(userId),
    ]);
    if (currentThreadRef.current !== forThread) return;
    const inThread = (message: { station: string; activationId: number }) =>
      message.station === station && message.activationId === activationId;
    setOwn(
      [
        ...pending.filter(inThread).map((message): OwnMessage => ({
          clientMessageId: message.clientMessageId,
          text: message.text,
          writtenAt: message.writtenAt,
          delivery: { kind: "pending" },
        })),
        ...rejected.filter(inThread).map((message): OwnMessage => ({
          clientMessageId: message.clientMessageId,
          text: message.text,
          writtenAt: message.writtenAt,
          delivery: {
            kind: "refused",
            reason: `Ikke sendt. ${threadErrorMessage(message.rejection.code)}`,
          },
        })),
      ].sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)),
    );
    // A refusal that means the steward has no thread any more: the app's
    // copy of the scenario is out of date.
    if (
      rejected.some(
        (message) => inThread(message) && closesThread(message.rejection.code),
      )
    )
      onClosedByServer();
  }, [userId, station, activationId, threadKey, onClosedByServer]);

  // Shows the queue as it is now, and again whenever it changes: a message
  // written here, or a send from the chat or from the retry loop in
  // StewardView (MET-A-029, #445). A message the server stored joins the
  // thread at once.
  useEffect(() => {
    void showOwn().catch(() => undefined);
    return onStationMessagesChanged((result) => {
      const delivered = (result?.delivered ?? []).filter(
        (message) =>
          message.station === station && message.activationId === activationId,
      );
      if (delivered.length > 0)
        setMessages((current) => merge(current, delivered));
      void showOwn().catch(() => undefined);
    });
  }, [showOwn, station, activationId]);

  // Saves the message on the phone first, then sends it. Without a
  // connection it stays as "Afventer" and goes out when the phone is back
  // online; the same id means the server never stores it twice. The field
  // is cleared only once the message is saved, so a failed save loses
  // nothing.
  const send = () => {
    const written = draft.trim();
    if (
      !isSendableText(written) ||
      userId === null ||
      station === undefined ||
      activationId === undefined ||
      savingRef.current
    )
      return;
    savingRef.current = true;
    void (async () => {
      let message: QueuedStationMessage;
      try {
        message = await queueStationMessage({
          userId,
          station,
          activationId,
          text: written,
        });
      } catch {
        setSaveFailed(true);
        return;
      } finally {
        savingRef.current = false;
      }
      setSaveFailed(false);
      // Text written while the message was saved stays.
      setDraft((current) => (current.trim() === written ? "" : current));
      setMine((current) => new Set([...current, message.clientMessageId]));
      void rememberOwnMessage(
        userId,
        activationId,
        station,
        message.clientMessageId,
      );
      await stationMessageDelivery.flush(userId, token);
    })().catch(() => undefined);
  };

  const dismissNotice = useCallback(() => setNotice(null), []);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const closed =
    station === undefined ? closedReason : (closedByServer ?? null);

  if (station === undefined && !shown) return null;

  return (
    <>
      {station !== undefined && !open && (
        <ChatTab
          onPress={openChat}
          dragHandlers={tabDragHandlers}
          unread={unread}
        />
      )}

      {station !== undefined && !open && notice !== null && (
        <MessageNotice
          text={notice}
          onOpen={openChat}
          onDismiss={dismissNotice}
        />
      )}

      {shown && (
        <Animated.View
          style={[styles.panel, { transform: [{ translateX }] }]}
          accessibilityViewIsModal={open}
          testID="station-chat"
          {...panelDragHandlers}
        >
          <View style={[styles.fill, { paddingBottom: keyboardPadding }]}>
            <ChatHeader
              station={closed === null ? station : lastStation}
              closed={closed !== null}
              onClose={closeChat}
            />

            {closed !== null ? (
              <ChatClosedNotice reason={closed} onBack={closeChat} />
            ) : (
              <>
                <ScrollView
                  ref={scrollRef}
                  style={styles.fill}
                  contentContainerStyle={styles.messages}
                  onContentSizeChange={() =>
                    scrollRef.current?.scrollToEnd({ animated: false })
                  }
                  // The keyboard makes the list shorter; keep the newest
                  // message in sight.
                  onLayout={() =>
                    scrollRef.current?.scrollToEnd({ animated: false })
                  }
                  keyboardShouldPersistTaps="handled"
                >
                  {!loaded && messages.length === 0 && (
                    <Text style={styles.info}>Henter beskeder…</Text>
                  )}
                  {loaded &&
                    !loadError &&
                    messages.length === 0 &&
                    own.length === 0 && (
                      <Text style={styles.info}>
                        Ingen beskeder endnu. Skriv til kontrolrummet, hvis I
                        har brug for noget, der ikke haster.
                      </Text>
                    )}
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      fromStation={message.sender === "STATION"}
                      colleague={
                        message.sender === "STATION" &&
                        !mine.has(message.clientMessageId.toLowerCase())
                      }
                      showSender={
                        messages[index - 1]?.sender !== message.sender
                      }
                      text={message.text}
                      writtenAt={message.writtenAt}
                    />
                  ))}
                  {own.map((message, index) => (
                    <MessageBubble
                      key={message.clientMessageId}
                      fromStation
                      showSender={
                        index > 0
                          ? false
                          : messages[messages.length - 1]?.sender !== "STATION"
                      }
                      text={message.text}
                      writtenAt={message.writtenAt}
                      delivery={message.delivery}
                    />
                  ))}
                  {loadError && (
                    <View style={styles.loadError}>
                      <View style={styles.loadErrorRow}>
                        <WarningIcon />
                        <Text
                          style={styles.loadErrorText}
                          accessibilityRole="alert"
                        >
                          Beskederne kunne ikke hentes. {loadError}
                        </Text>
                      </View>
                      <Pressable accessibilityRole="button" onPress={load}>
                        <Text style={styles.link}>Prøv igen</Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>

                {saveFailed && (
                  <View style={styles.saveFailed}>
                    <WarningIcon />
                    <Text
                      style={styles.loadErrorText}
                      accessibilityRole="alert"
                    >
                      Beskeden kunne ikke gemmes på telefonen. Prøv igen.
                    </Text>
                  </View>
                )}
                <MessageComposer
                  draft={draft}
                  onChangeDraft={setDraft}
                  onSend={send}
                />
              </>
            )}
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  panel: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  messages: {
    gap: spacing.medium,
    padding: spacing.large,
  },
  info: {
    color: steward.muted,
    fontSize: 14,
    textAlign: "center",
  },
  loadError: {
    alignItems: "center",
    gap: 6,
  },
  loadErrorRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
  },
  saveFailed: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.large,
    paddingTop: spacing.small,
  },
  loadErrorText: {
    color: steward.nobody,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  link: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 4,
    textDecorationLine: "underline",
  },
});
