import { useCallback, useEffect, useState } from "react";
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
          setThreads(
            loaded.filter((thread) => thread.activationId === activationId),
          );
          setListError(null);
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setListError(stationMessageError(error));
        },
      );
    }

    function refreshThread() {
      if (station === null) return;
      detailRequest?.abort();
      const controller = new AbortController();
      detailRequest = controller;
      fetchStationThread(token, station, controller.signal).then(
        (loaded) => {
          if (controller.signal.aborted) return;
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

  return {
    threads: closed ? [] : threads,
    thread: !closed && thread?.station === station ? thread : null,
    listError,
    threadError: detailError?.station === station ? detailError.message : null,
    closed,
    reload,
    send,
  };
}
