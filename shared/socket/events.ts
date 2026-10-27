import type { Scenario } from "../types/v1/scenario";
import type { PositionReport } from "../types/v1/position-report";

// Events the server pushes: activations to stewards, position reports and the
// "activations changed" signal to operators.
export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
  // No payload: operators refetch GET /api/v1/activations.
  "activations-changed": () => void;
  "position-report": (
    PositionReport: PositionReport & { sentAt: string },
  ) => void;
}

// Empty: clients send their changes over HTTP, not the socket (ADR 0008).
export interface ClientToServerEvents {}

// The whole activated scenario, plus when the server sent it.
export type ScenarioActivated = { scenario: Scenario; sentAt: string };
