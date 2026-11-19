import type { Scenario } from "../types/v1/scenario.js";
import type { PositionReport } from "../types/v1/position-report.js";
import type { StationMessage } from "../types/v1/station-message.js";
import type { StationThread } from "../types/v1/station-thread.js";

// Events the server pushes: activations to stewards, position reports and the
// "activations changed" signal to operators, and station messages to both.
export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
  // No payload: operators refetch GET /api/v1/activations.
  "activations-changed": () => void;
  // No payload: stewards refetch GET /api/v1/scenario-state.
  "scenario-stood-down": () => void;
  "position-report": (
    PositionReport: PositionReport & { sentAt: string },
  ) => void;
  // A new message in a station's thread (MET-A-029): to operators in the
  // activation's line group and to stewards checked in at the station.
  "station-message": (event: StationMessageEvent) => void;
  // The activation was stood down or replaced in a switch, so its station
  // threads are closed. To both roles in the activation's line group. Not
  // replayed: a client that was offline learns it from the HTTP API.
  "station-threads-closed": (event: StationThreadsClosed) => void;
}

// Empty: clients send their changes over HTTP, not the socket (ADR 0008).
export interface ClientToServerEvents {}

export type ScenarioActivated = {
  scenario: Scenario;
  sentAt: string;
  sequence: number;
};

export type StationMessageEvent = {
  message: StationMessage;
  // The thread after the message, without its messages.
  thread: Omit<StationThread, "messages">;
  sentAt: string;
};

export type StationThreadsClosed = {
  activationId: number;
  sentAt: string;
};
