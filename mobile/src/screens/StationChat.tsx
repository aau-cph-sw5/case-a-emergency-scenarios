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
import type { StationMessageEvent } from "../../../shared/socket/events";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import { colors, spacing, steward } from "../../../shared/Theme";
import { ChatClosedNotice, ChatHeader } from "../components/ChatHeader";
import { ChatTab } from "../components/ChatTab";
import { MessageBubble, WarningIcon } from "../components/MessageBubble";
import { closesThread, stationThread } from "../data/station-thread";
import { socket } from "../socket";
import { useSlideInPanel } from "../useSlideInPanel";

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
  // Whether the thread has been read since the chat showed this thread.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Set when the server closed the thread while the app still had a station.
  const [closedByServer, setClosedByServer] = useState<string | null>(null);
  if (threadKey !== shownThreadKey) {
    setShownThreadKey(threadKey);
    // The station going away keeps the old messages behind the closed
    // notice; a new station or activation starts empty.
    if (threadKey !== undefined) {
      setMessages([]);
      setLoaded(false);
      setLoadError(null);
      setClosedByServer(null);
    }
  }

  // A refusal that means there is no thread any more closes the chat.
  const closeByServer = useCallback(
    (reason: string) => {
      setClosedByServer(reason);
      onClosedByServer();
    },
    [onClosedByServer],
  );

  // Shows the thread read from the server: the earlier messages too, also
  // those written before the steward checked in.
  const showRead = useCallback(
    (result: Awaited<ReturnType<typeof stationThread<{ type: "read" }>>>) => {
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
    if (station === undefined) return;
    void stationThread(token, station, { type: "read" }).then(showRead);
  }, [token, station, showRead]);

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

  const scrollRef = useRef<ScrollViewInstance>(null);
  const closed =
    station === undefined ? closedReason : (closedByServer ?? null);

  if (station === undefined && !shown) return null;

  return (
    <>
      {station !== undefined && !open && (
        <ChatTab onPress={openChat} dragHandlers={tabDragHandlers} />
      )}

      {shown && (
        <Animated.View
          style={[styles.panel, { transform: [{ translateX }] }]}
          accessibilityViewIsModal={open}
          testID="station-chat"
          {...panelDragHandlers}
        >
          <View style={styles.fill}>
            <ChatHeader
              station={closed === null ? station : lastStation}
              closed={closed !== null}
              onClose={closeChat}
            />

            {closed !== null ? (
              <ChatClosedNotice reason={closed} onBack={closeChat} />
            ) : (
              <ScrollView
                ref={scrollRef}
                style={styles.fill}
                contentContainerStyle={styles.messages}
                onContentSizeChange={() =>
                  scrollRef.current?.scrollToEnd({ animated: false })
                }
              >
                {!loaded && messages.length === 0 && (
                  <Text style={styles.info}>Henter beskeder…</Text>
                )}
                {loaded && !loadError && messages.length === 0 && (
                  <Text style={styles.info}>Ingen beskeder endnu.</Text>
                )}
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    fromStation={message.sender === "STATION"}
                    showSender={messages[index - 1]?.sender !== message.sender}
                    text={message.text}
                    writtenAt={message.writtenAt}
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
