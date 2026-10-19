import type { Scenario } from "../scenario";

export interface ServerToClientEvents {
  welcome: (message: string) => void;
  "scenario-activated": (activation: ScenarioActivated) => void;
}

export interface ClientToServerEvents {}

export type ScenarioActivated = { scenario: Scenario; sentAt: string };
