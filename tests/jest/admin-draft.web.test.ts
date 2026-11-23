import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import {
  readScenarioDraft,
  writeScenarioDraft,
  clearScenarioDraft,
  type ScenarioDraft,
} from "../../web/src/admin-draft";

const token = `header.${btoa(JSON.stringify({ userId: 42 }))}.signature`;
const other = `header.${btoa(JSON.stringify({ userId: 43 }))}.signature`;
const draft: ScenarioDraft = {
  lineGroup: "M1/M2",
  view: "staffing",
  editingLine: true,
  editingRouteId: 3,
  scenarioId: "TEST",
  scenarioName: "Test",
  from: "VAN",
  to: "FL",
  selectedStops: ["VAN", "FL"],
  manualType: "PENDULUM",
  track: 1,
  lineColor: "#FF0000",
  did: "D",
  maximumTrains: "2",
  pathIndex: 0,
  routes: [
    {
      id: 3,
      from: "VAN",
      to: "FL",
      type: "PENDULUM",
      track: 1,
      did: "D",
      color: "#FF0000",
      maximumTrains: 2,
      stations: ["VAN", "FL"],
      stops: ["VAN", "FL"],
    },
  ],
  staffing: [
    {
      station: "VAN",
      placement: "",
      minimumStaffing: 1,
      tasks: [{ id: 1, instruction: "Help" }],
      windows: [
        { id: 1, dayPattern: "man–fre", startTime: "07:00", endTime: "09:00" },
      ],
    },
  ],
};
describe("scenario draft storage", () => {
  beforeEach(() => sessionStorage.clear());
  it("restores a complete draft only for the same user and does not store the token", () => {
    expect(writeScenarioDraft(token, draft)).toBe(true);
    expect(readScenarioDraft(token)).toEqual(draft);
    expect(readScenarioDraft(other)).toBeNull();
    expect(sessionStorage.getItem("metro-scenario-draft-v1:42")).not.toContain(
      token,
    );
    clearScenarioDraft(token);
    expect(readScenarioDraft(token)).toBeNull();
  });
  it("rejects invalid tokens, malformed drafts and corrupted storage", () => {
    expect(writeScenarioDraft("bad", draft)).toBe(false);
    expect(readScenarioDraft("bad")).toBeNull();
    clearScenarioDraft("bad");
    sessionStorage.setItem("metro-scenario-draft-v1:42", "{");
    expect(readScenarioDraft(token)).toBeNull();
    for (const patch of [
      { editingRouteId: -1 },
      { lineGroup: "invalid" },
      { routes: [{ ...draft.routes[0], color: "bad" }] },
      { staffing: [{ ...draft.staffing[0], minimumStaffing: 0 }] },
      { selectedStops: [1] },
    ]) {
      sessionStorage.setItem(
        "metro-scenario-draft-v1:42",
        JSON.stringify({ ...draft, ...patch }),
      );
      expect(readScenarioDraft(token)).toBeNull();
    }
  });
  it("handles unavailable session storage without throwing", () => {
    const get = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(readScenarioDraft(token)).toBeNull();
    get.mockRestore();
    const set = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(writeScenarioDraft(token, draft)).toBe(false);
    set.mockRestore();
    const remove = jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(() => clearScenarioDraft(token)).not.toThrow();
    remove.mockRestore();
  });
});
