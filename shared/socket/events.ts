import type { Scenario } from "../types/v1/scenario";
import type { PositionReport } from "../types/v1/position-report";
import type { StewardStatus } from "../types/v1/steward-status";

// Events the server pushes: activations to stewards; position reports, steward
// status changes and the "activations changed" signal to operators.
export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
  // No payload: operators refetch GET /api/v1/activations.
  "activations-changed": () => void;
  "position-report": (
    PositionReport: PositionReport & { sentAt: string },
  ) => void;
  // A steward's status after a change (MET-A-015). After a reconnect,
  // operators refetch GET /api/v1/steward-statuses.
  "steward-status-changed": (status: StewardStatus) => void;
}

// Empty: clients send their changes over HTTP, not the socket (ADR 0008).
export interface ClientToServerEvents {}

export type ScenarioActivated = {
  scenario: Scenario;
  sentAt: string;
  sequence: number;
};
