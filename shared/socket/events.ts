import type { Scenario } from "../types/v1/scenario";
import type { PositionReport } from "../types/v1/position-report";

// Events the server pushes: activations to stewards, position reports to operators.
export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
  "position-report": (PositionReport: PositionReport & {sentAt: string}) => void;
}

// Empty: clients send their changes over HTTP, not the socket (ADR 0008).
export interface ClientToServerEvents {
}

// The whole activated scenario, plus when the server sent it.
export type ScenarioActivated = { scenario: Scenario; sentAt: string };
