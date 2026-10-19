// from contracts/v1/scenario.schema.json
export type TrackSegment = {
  trackNumber: number; 
  stationA: string;
  stationB: string;
};

export type OperatingPattern = {
  operationType: "PENDULUM" | "ROUNDTRIP";
  routeCode: string;
  trackNumber: number; 
  maximumTrains: number;
  did: string;
  description?: string;
  route: object[];
};

export type StationRequirement = {
  station: string;
  placement: string;
  minimumStaffing: number;
  activeDuring?: { dayPattern: string; startTime: string; endTime: string }[];
  actions?: { sequence: number; instruction: string }[];
};

export type ScenarioVersion = {
  version: string;
  revision: string;
  operatingPlan: { name: string; patterns: OperatingPattern[] };
  stationRequirements: StationRequirement[];
};

export type Scenario = {
  scenarioId: string;
  name: string;
  currentVersion: string;
  covers?: TrackSegment[];
  versions: ScenarioVersion[];
};