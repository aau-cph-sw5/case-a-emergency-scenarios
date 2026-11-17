import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StationMessageEvent,
  StationThreadsClosed,
} from "../../../shared/socket/events";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
import type { StationThread } from "../../../shared/types/v1/station-thread";
import { ApiError } from "../get-json";
import {
  fetchStationThread,
  fetchStationThreads,
  sendStationMessage,
  stationMessageError,
} from "../station-threads";
import { useLiveContext } from "./liveData";

export function useStationThreads(
  token: string,
  activationId: number | null,
  station: string | null,
) {
  const { socket } = useLiveContext();
  const [threads, setThreads] = useState<StationThread[] | null>(null);
  const [thread, setThread] = useState<StationThread | null>(null);
  const [history, setHistory] = useState<Record<string, StationThread>>({});
  const fetchedRef = useRef(new Map<string, StationThread>());
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<{
    station: string;
    message: string;
  } | null>(null);
  const [closed, setClosed] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (activationId === null || closed) return;
    let listRequest: AbortController | undefined;
    let detailRequest: AbortController | undefined;

    function refreshList() {
      listRequest?.abort();
      const controller = new AbortController();
      listRequest = controller;
      fetchStationThreads(token, controller.signal).then(
        (loaded) => {
          if (controller.signal.aborted) return;
          const current = loaded.filter(
            (thread) => thread.activationId === activationId,
          );
          setThreads((previous) =>
            current.length ? current : (previous ?? []),
          );
          setListError(null);
          for (const summary of current) {
            const cached = fetchedRef.current.get(summary.station);
            if (
              cached?.lastMessageAt === summary.lastMessageAt &&
              cached?.state === summary.state
            )
              continue;
            void fetchStationThread(token, summary.station, controller.signal)
              .then((detail) => {
                if (
                  !controller.signal.aborted &&
                  detail.activationId === activationId
                ) {
                  remember(detail);
                }
              })
              .catch(() => {});
          }
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setListError(stationMessageError(error));
        },
      );
    }

    function remember(detail: StationThread) {
      const previous = fetchedRef.current.get(detail.station);
      if (
        (previous?.messages?.at(-1)?.id ?? 0) >
        (detail.messages?.at(-1)?.id ?? 0)
      )
        return;
      fetchedRef.current.set(detail.station, detail);
      setHistory((saved) => ({ ...saved, [detail.station]: detail }));
    }

    function refreshThread() {
      if (station === null) return;
      detailRequest?.abort();
      const controller = new AbortController();
      detailRequest = controller;
      fetchStationThread(token, station, controller.signal).then(
        (loaded) => {
          if (controller.signal.aborted) return;
          if (loaded.activationId === activationId) remember(loaded);
          setThread(loaded.activationId === activationId ? loaded : null);
          setDetailError(null);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof ApiError && error.status === 409)
            setThread(null);
          setDetailError({ station, message: stationMessageError(error) });
        },
      );
    }

    function refresh() {
      refreshList();
      refreshThread();
    }

    function onMessage({ message }: StationMessageEvent) {
      if (message.activationId !== activationId) return;
      refreshList();
      if (message.station === station) refreshThread();
    }

    function onClosed(event: StationThreadsClosed) {
      if (event.activationId !== activationId) return;
      listRequest?.abort();
      detailRequest?.abort();
      setClosed(true);
    }

    socket?.on("connect", refresh);
    socket?.on("station-message", onMessage);
    socket?.on("station-threads-closed", onClosed);
    refresh();
    return () => {
      listRequest?.abort();
      detailRequest?.abort();
      socket?.off("connect", refresh);
      socket?.off("station-message", onMessage);
      socket?.off("station-threads-closed", onClosed);
    };
  }, [activationId, station, token, socket, revision, closed]);

  async function send(station: string, request: StationMessageRequest) {
    const message = await sendStationMessage(token, station, request);
    reload();
    return message;
  }

  const readOnly = closed || activationId === null;
  return {
    history,
    threads: readOnly
      ? Object.values(history).filter((detail) => detail.messages?.length)
      : threads,
    thread: readOnly
      ? (station && history[station]) || null
      : thread?.station === station
        ? thread
        : null,
    listError: readOnly ? null : listError,
    threadError:
      !readOnly && detailError?.station === station
        ? detailError.message
        : null,
    closed,
    reload,
    send,
  };
}
