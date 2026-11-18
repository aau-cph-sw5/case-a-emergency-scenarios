import type { Server } from "socket.io";
import { roleRoom, stationRoom, userRoom } from "./socket-server.js";
import type {
  StationMessageEvent,
  StationThreadsClosed,
} from "../../shared/socket/events.js";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import { getDatabase } from "../db/client.js";
import { findActiveActivation } from "../repositories/activation-repository.js";
import { findCheckedInStation } from "../repositories/station-message-repository.js";
import type { StoredActivation } from "../repositories/activation-repository.js";

export function setCheckedIn(
  io: Server,
  userId: number,
  activationId: number,
  station: string,
  checkedIn: boolean,
) {
  const sockets = io.in(userRoom(userId));
  const room = stationRoom(activationId, station);
  if (checkedIn) sockets.socketsJoin(room);
  else sockets.socketsLeave(room);
}
const pendingSyncs = new Map<number, Promise<void>>();

export function syncStationRoom(
  io: Server,
  userId: number,
  lineGroup: LineGroup,
): Promise<void> {
  const previous = pendingSyncs.get(userId) ?? Promise.resolve();
  const current = previous
    .then(() => applyStationRoom(io, userId, lineGroup))
    .catch((error: unknown) => {
      console.error("Failed to sync station room for user", error);
    });
  pendingSyncs.set(userId, current);
  void current.then(() => {
    if (pendingSyncs.get(userId) === current) pendingSyncs.delete(userId);
  });
  return current;
}
async function applyStationRoom(
  io: Server,
  userId: number,
  lineGroup: LineGroup,
) {
  const activation = await findActiveActivation(lineGroup);
  const station = activation
    ? await findCheckedInStation(getDatabase(), userId, activation.activationId)
    : null;
  const target =
    activation && station
      ? stationRoom(activation.activationId, station)
      : undefined;

  for (const socket of await io.in(userRoom(userId)).fetchSockets()) {
    for (const room of socket.rooms) {
      if (room.startsWith("station:") && room !== target) socket.leave(room);
    }
    if (target) socket.join(target);
  }
}
export function emitStationMessage(
  io: Server,
  activation: Pick<StoredActivation, "activationId" | "lineGroup">,
  message: StationMessageEvent["message"],
  thread: StationMessageEvent["thread"],
) {
  if (message.activationId !== activation.activationId) {
    console.error(
      `Station message ${message.id} is for activation ${message.activationId}, not ${activation.activationId}; not sent`,
    );
    return;
  }
  const event: StationMessageEvent = {
    message,
    thread,
    sentAt: new Date().toISOString(),
  };

  io.to(roleRoom("OPERATOR", activation.lineGroup))
    .to(stationRoom(activation.activationId, message.station))
    .emit("station-message", event);
}
export function emitThreadsClosed(
  io: Server,
  activation: Pick<
    StoredActivation,
    "activationId" | "lineGroup" | "deployments"
  >,
) {
  const { activationId, lineGroup, deployments } = activation;
  const event: StationThreadsClosed = {
    activationId,
    sentAt: new Date().toISOString(),
  };
  io.to(roleRoom("STEWARD", lineGroup))
    .to(roleRoom("OPERATOR", lineGroup))
    .emit("station-threads-closed", event);

  for (const station of new Set(deployments.map((d) => d.fulfills))) {
    const room = stationRoom(activationId, station);
    io.in(room).socketsLeave(room);
  }
}
