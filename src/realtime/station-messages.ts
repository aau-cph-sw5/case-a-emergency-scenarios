import type { Server } from "socket.io";
import { roleRoom, stationRoom, userRoom } from "./socket-server.js";
import type {
    StationMessageEvent,
    StationThreadsClosed,
  } from "../../shared/socket/events.js";
  import type { LineGroup } from "../../shared/auth/line-groups.js";

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
export function emitStationMessage(
    io: Server,
    lineGroup: LineGroup,
    message: StationMessageEvent["message"],
    thread: StationMessageEvent["thread"],
) {
    const event: StationMessageEvent = {
        message, thread, sentAt: new Date().toISOString(),
    };
    io.to(roleRoom("OPERATOR", lineGroup))
    .to(stationRoom(message.activationId, message.station))
    .emit("station-message", event);
}
export function emitThreadsClosed(
    io: Server,
    activationId: number,
    lineGroup: LineGroup,
){
    const event: StationThreadsClosed = {
        activationId, sentAt: new Date().toISOString(),
    };
    io.to(roleRoom("STEWARD", lineGroup))
    .to(roleRoom("OPERATOR", lineGroup))
    .emit("station-threads-closed", event);
    
    const prefix = stationRoom(activationId, "");
    for (const room of io.of("/").adapter.rooms.keys()) {
        if (room.startsWith(prefix)) io.socketsLeave(room)
        }
    }
