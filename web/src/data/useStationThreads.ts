import { useCallback, useEffect, useRef, useState } from "react";
import {
  isStationMessageEvent,
  isStationThreadsClosed,
  type StationThreadSummary,
  type StationThreadWithMessages,
} from "../../../shared/station-messages/validate";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
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
  const [threads, setThreads] = useState<StationThreadSummary[] | null>(null);
  const [thread, setThread] = useState<StationThreadWithMessages | null>(null);
  const fetchedRef = useRef(new Map<string, StationThreadWithMessages>());
  const detailRefreshRef = useRef<{
    station: string;
    refresh: () => void;
    abort: () => void;
  } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selection, setSelection] = useState(station);
  const [closed, setClosed] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  // Reopening a chat must wait for a fresh result before marking it read.
  if (selection !== station) {
    setSelection(station);
    setThread(null);
    setDetailError(null);
  }

  useEffect(() => {
    if (activationId === null || closed) return;
    let request: AbortController | undefined;

    function refreshList() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      fetchStationThreads(token, controller.signal).then(
        (loaded) => {
          if (controller.signal.aborted) return;
          setThreads(
            loaded.filter((entry) => entry.activationId === activationId),
          );
          setListError(null);
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setListError(stationMessageError(error));
        },
      );
    }

    function onConnect() {
      refreshList();
      detailRefreshRef.current?.refresh();
    }

    function onMessage(event: unknown) {
      if (!isStationMessageEvent(event)) return;
      const { message, thread } = event;
      if (message.activationId !== activationId) return;
      // Keep the badge current even if the following list request fails.
      setThreads((current) => {
        const previous = current?.find(
          (entry) => entry.station === message.station,
        );
        const ids = new Set(
          thread.stationMessageIds ?? previous?.stationMessageIds,
        );
        if (message.sender === "STATION") ids.add(message.id);
        const updated: StationThreadSummary = {
          ...thread,
          stationMessageIds: [...ids],
        };
        return [
          ...(current ?? []).filter(
            (entry) => entry.station !== message.station,
          ),
          updated,
        ];
      });
      refreshList();
      if (detailRefreshRef.current?.station === message.station) {
        detailRefreshRef.current.refresh();
      }
    }

    function onClosed(event: unknown) {
      if (!isStationThreadsClosed(event)) return;
      if (event.activationId !== activationId) return;
      request?.abort();
      detailRefreshRef.current?.abort();
      fetchedRef.current.clear();
      setThreads(null);
      setThread(null);
      setListError(null);
      setDetailError(null);
      setClosed(true);
    }

    socket?.on("connect", onConnect);
    socket?.on("station-message", onMessage);
    socket?.on("station-threads-closed", onClosed);
    refreshList();
    return () => {
      request?.abort();
      socket?.off("connect", onConnect);
      socket?.off("station-message", onMessage);
      socket?.off("station-threads-closed", onClosed);
    };
  }, [activationId, token, socket, revision, closed]);

  useEffect(() => {
    if (activationId === null || closed || station === null) return;
    const selectedStation = station;
    let request: AbortController | undefined;

    function refreshThread() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      fetchStationThread(token, selectedStation, controller.signal).then(
        (loaded) => {
          if (controller.signal.aborted) return;
          if (loaded.activationId !== activationId) {
            setThread(null);
            setDetailError(
              stationMessageError(new ApiError("Activation changed", 409)),
            );
            return;
          }
          const previous = fetchedRef.current.get(loaded.station);
          if (
            (previous?.messages.at(-1)?.id ?? 0) >
            (loaded.messages.at(-1)?.id ?? 0)
          )
            return;
          fetchedRef.current.set(loaded.station, loaded);
          setThread(loaded);
          setDetailError(null);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setDetailError(stationMessageError(error));
        },
      );
    }

    detailRefreshRef.current = {
      station: selectedStation,
      refresh: refreshThread,
      abort: () => request?.abort(),
    };
    refreshThread();
    return () => {
      request?.abort();
      detailRefreshRef.current = null;
    };
  }, [activationId, station, token, revision, closed]);

  async function send(station: string, request: StationMessageRequest) {
    const message = await sendStationMessage(token, station, request);
    reload();
    return message;
  }

  const inactive = closed || activationId === null;
  return {
    threads: inactive ? null : threads,
    thread: inactive ? null : thread?.station === station ? thread : null,
    listError: inactive ? null : listError,
    threadError: !inactive && station !== null ? detailError : null,
    closed,
    reload,
    send,
  };
}
