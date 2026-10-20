import type { Scenario } from "../types/v1/scenario";
import type { PositionReport } from "../types/v1/position-report";

export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
  "position-report": (PositionReport: PositionReport & {sentAt: string}) => void;
}

export interface ClientToServerEvents {
}

export type ScenarioActivated = { scenario: Scenario; sentAt: string };
