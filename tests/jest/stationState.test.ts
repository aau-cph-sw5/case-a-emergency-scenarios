import { describe, expect, it } from "@jest/globals";
import {
  countManned,
  countStewards,
  coverageShare,
  getStationState,
} from "../../shared/components/stationState";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

type Deployment = ScenarioState["deployments"][number];

function createDeployment(
  fulfills: string,
  status: Deployment["status"],
  reportedAt?: string | null,
): Deployment {
  return {
    fulfills,
    status,
    ...(reportedAt === undefined ? {} : { reportedAt }),
  };
}

describe("getStationState", () => {
  it("fills missing required positions as unmanned", () => {
    expect(getStationState({ deployments: [] }, "Station A", 2)).toEqual({
      statuses: ["UNMANNED", "UNMANNED"],
      current: 0,
      enRoute: 0,
    });
  });

  it("includes extra deployments, and counts manned and en-route stewards", () => {
    const state = getStationState(
      {
        deployments: [
          createDeployment("Station A", "PENDING", "2026-10-18T08:30:00Z"),
          createDeployment("Station A", "MANNED", "2026-10-18T09:15:00Z"),
          createDeployment("Station A", "UNMANNED", null),
          createDeployment("Station B", "MANNED", "2026-10-18T10:00:00Z"),
        ],
      },
      "Station A",
      1,
    );

    expect(state).toEqual({
      statuses: ["PENDING", "MANNED", "UNMANNED"],
      current: 1,
      enRoute: 1,
    });
  });
});

describe("countManned", () => {
  it("counts fully staffed requirements and treats zero staffing as covered", () => {
    const requirements = [
      { station: "Station A", minimumStaffing: 2 },
      { station: "Station B", minimumStaffing: 1 },
      { station: "Station C", minimumStaffing: 0 },
    ];
    const state = {
      deployments: [
        createDeployment("Station A", "MANNED"),
        createDeployment("Station A", "PENDING"),
        createDeployment("Station B", "MANNED"),
      ],
    };

    expect(countManned(state, requirements)).toBe(2);
  });
});

describe("countStewards", () => {
  it("counts no more arrived stewards at a station than it needs", () => {
    expect(
      countStewards(
        {
          deployments: [
            createDeployment("Station A", "MANNED"),
            createDeployment("Station A", "MANNED"),
            createDeployment("Station B", "PENDING"),
          ],
        },
        [
          { station: "Station A", minimumStaffing: 1 },
          { station: "Station B", minimumStaffing: 2 },
        ],
      ),
    ).toEqual({ arrived: 1, enRoute: 1, needed: 3 });
  });
});

describe("coverageShare", () => {
  it("is the share of needed stewards who arrived, at most 1", () => {
    const state = {
      deployments: [
        createDeployment("Station A", "MANNED"),
        createDeployment("Station A", "PENDING"),
        createDeployment("Station B", "MANNED"),
        createDeployment("Station B", "MANNED"),
      ],
    };

    expect(
      coverageShare(state, { station: "Station A", minimumStaffing: 2 }),
    ).toBe(0.5);
    expect(
      coverageShare(state, { station: "Station B", minimumStaffing: 1 }),
    ).toBe(1);
  });

  it("treats a station that needs nobody as covered", () => {
    expect(
      coverageShare(
        { deployments: [] },
        { station: "Station C", minimumStaffing: 0 },
      ),
    ).toBe(1);
  });
});
