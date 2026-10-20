import type { Scenario } from "../scenario";

export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
  "position-report": (PositionReport: PositionReport) => void;
}

export interface ClientToServerEvents {
}

export type ScenarioActivated = { scenario: Scenario; sentAt: string };
export type PositionReport = {
  staff: string;
  station: string;
  reportedAt: string;
  sentAt: string;
};
