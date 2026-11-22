import { isStationMessage } from "../../../shared/station-messages/validate";
import type { StationMessage } from "../../../shared/types/v1/station-message";

export function loadMessageSession(key: string | null, activationId?: number) {
  const empty = {
    readIds: new Set<number>(),
    pinned: new Map<number, StationMessage>(),
  };
  if (key === null) return empty;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(key) ?? "null");
    if (typeof saved !== "object" || saved === null) return empty;
    return {
      readIds: new Set<number>(
        Array.isArray(saved.readIds)
          ? saved.readIds.filter(
              (id: unknown) => Number.isSafeInteger(id) && Number(id) > 0,
            )
          : [],
      ),
      pinned: new Map<number, StationMessage>(
        Array.isArray(saved.pinned)
          ? saved.pinned
              .filter(isStationMessage)
              .filter(
                (message: StationMessage) =>
                  message.sender === "STATION" &&
                  message.activationId === activationId,
              )
              .map((message: StationMessage) => [message.id, message])
          : [],
      ),
    };
  } catch {
    // Storage can be unavailable or contain an invalid entry.
    return empty;
  }
}

export function saveMessageSession(
  key: string | null,
  readIds: ReadonlySet<number>,
  pinned: ReadonlyMap<number, StationMessage>,
) {
  if (key === null) return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        readIds: [...readIds].filter((id) => id > 0),
        pinned: [...pinned.values()].filter(
          ({ id, sender }) => id > 0 && sender === "STATION",
        ),
      }),
    );
  } catch {
    // The conversation remains usable when browser storage is unavailable.
  }
}

export function clearMessageSession(key: string | null) {
  if (key === null) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable.
  }
}
