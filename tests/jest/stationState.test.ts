import { describe, expect, it } from "@jest/globals";
import {
  countManned,
  countStewards,
  formatTime,
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
      lastUpdate: undefined,
    });
  });

  it("includes extra deployments, counts only manned stewards, and picks the latest report", () => {
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
      lastUpdate: "2026-10-18T09:15:00Z",
    });
  });

  it("returns no report time when matching deployments have no timestamps", () => {
    expect(
      getStationState(
        { deployments: [createDeployment("Station A", "UNMANNED", null)] },
        "Station A",
        1,
      ).lastUpdate,
    ).toBeUndefined();
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

describe("formatTime", () => {
  it("uses a placeholder for missing timestamps", () => {
    expect(formatTime()).toBe("--:--");
    expect(formatTime(null)).toBe("--:--");
  });

  it("uses a placeholder for an invalid timestamp", () => {
    expect(formatTime("not-a-timestamp")).toBe("--:--");
  });

  it("formats valid timestamps as a localized hour and minute", () => {
    const timestamp = "2026-10-18T09:15:00Z";
    const expected = new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    expect(formatTime(timestamp)).toBe(expected);
  });
});
