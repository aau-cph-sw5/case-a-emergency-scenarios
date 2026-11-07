import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { OperatorDashboard } from "../../web/src/OperatorDashboard";
import { MetroMap } from "../../web/src/components/MetroMap";
import { LiveDataProvider } from "../../web/src/data/liveData";
import type { AppSocket } from "../../shared/socket/createSocket";
import type { Scenario } from "../../shared/types/v1/scenario";

jest.mock("../../web/src/components/OperatorSections.css", () => ({}));
jest.mock("../../web/src/components/MetroMap", () => ({
  MetroMap: jest.fn(() => null),
}));
jest.mock("../../web/src/local-settings", () => ({
  mockStewardPositions: false,
}));

// Synthetic HTTP responses only in this test. The dashboard uses the real
// provider and API functions, rather than injecting a preloaded context.
const summaries = Array.from({ length: 240 }, (_, index) => ({
  scenarioId: `BACKEND-${index}`,
  name: `Scenarie fra API ${index}`,
}));
function detail(index: number): Scenario {
  return {
    ...summaries[index],
    currentVersion: "3",
    versions: [
      {
        version: "1",
        revision: "Old",
        operatingPlan: { name: "Old", patterns: [] },
        stationRequirements: [
          { station: "OLD", placement: "Old placement", minimumStaffing: 99 },
        ],
      },
      {
        version: "3",
        revision: "Current",
        operatingPlan: { name: "Current", patterns: [] },
        stationRequirements: [
          {
            station: `API-STATION-${index}`,
            placement: "Placering fra backend",
            minimumStaffing: 7,
          },
        ],
      },
    ],
  };
}

const socket = { connected: true, on() {}, off() {} } as unknown as AppSocket;
const fetchMock = jest.fn<typeof fetch>();
let originalFetch: typeof fetch;
let container: HTMLDivElement;
let root: Root;

function response(body: unknown, status = 200) {
  return { ok: status === 200, status, json: async () => body } as Response;
}
async function mount() {
  await act(async () =>
    root.render(
      <LiveDataProvider socket={socket} token="operator-token">
        <OperatorDashboard token="operator-token" onLogout={() => {}} />
      </LiveDataProvider>,
    ),
  );
}
async function searchAndSelect(index: number) {
  await act(async () => {
    const input = container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, summaries[index].name);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    const option = [...container.querySelectorAll("li button")].find(
      (button) => button.textContent === summaries[index].name,
    )!;
    expect(option).toBeTruthy();
    (option as HTMLButtonElement).click();
  });
}
function detailRequests() {
  return fetchMock.mock.calls.filter(([path]) =>
    String(path).startsWith("/api/v1/scenarios/"),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => {
    if (path === "/api/v1/scenarios") return response(summaries);
    if (path === "/api/v1/activations?status=ACTIVE") return response([]);
    const match = String(path).match(/^\/api\/v1\/scenarios\/BACKEND-(\d+)$/);
    if (match) return response(detail(Number(match[1])));
    throw new Error(`Unexpected request: ${path}`);
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("API-backed scenario preview", () => {
  it("keeps the active status bar and coverage when another scenario is selected", async () => {
    const normalFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (path, options) =>
      path === "/api/v1/activations?status=ACTIVE"
        ? response([
            {
              activationId: 1,
              scenarioId: summaries[0].scenarioId,
              status: "ACTIVE",
              startedAt: "2026-11-01T12:00:00Z",
              actor: "operator-test",
              deployments: [],
            },
          ])
        : normalFetch(path, options),
    );
    await mount();
    await searchAndSelect(221);
    const columns = container.querySelectorAll(".operator-sections > section");
    const card = columns[0].querySelector(".active-scenario-card")!;
    expect(card.textContent).toContain(`Aktivt scenarie: ${summaries[0].name}`);
    expect(card.textContent).toContain("Tid aktivt:");
    expect(
      columns[1].querySelector('[aria-label$=": 0 af 7 ankommet"]'),
    ).not.toBeNull();
    expect(container.querySelector(".scenario-preview")?.textContent).toContain(
      "API-STATION-221",
    );
  });

  it("searches 240 server scenarios and fetches only selected details, sharing cached results", async () => {
    await mount();
    // The list stays closed until the operator uses the search field.
    expect(container.querySelectorAll("li button")).toHaveLength(0);
    await act(async () => container.querySelector("input")!.focus());
    expect(container.querySelectorAll("li button")).toHaveLength(240);
    expect(detailRequests()).toHaveLength(0);

    await searchAndSelect(221);
    const preview = container.querySelector(".scenario-preview")!;
    expect(preview.textContent).toContain("API-STATION-221");
    expect(preview.textContent).not.toContain("Placering:");
    expect(preview.textContent).toContain("1 station · 7 stewards");
    expect(preview.textContent).not.toContain("Old placement");
    expect(jest.mocked(MetroMap).mock.lastCall?.[0].scenario).toEqual(
      detail(221),
    );
    expect(detailRequests()).toHaveLength(1);
    expect(detailRequests()[0][0]).toBe("/api/v1/scenarios/BACKEND-221");
    expect(detailRequests()[0][1]?.headers).toEqual({
      Authorization: "Bearer operator-token",
    });
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).not.toContain("ID-123");

    await searchAndSelect(239);
    expect(preview.textContent).toContain("API-STATION-239");
    await searchAndSelect(221);
    expect(preview.textContent).toContain("API-STATION-221");
    expect(detailRequests()).toHaveLength(2);
    expect(
      fetchMock.mock.calls.filter(([path]) => path === "/api/v1/scenarios"),
    ).toHaveLength(1);
  });

  it("shows an API failure without replacing missing backend requirements with demo data", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const normalFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (path, options) =>
      String(path).startsWith("/api/v1/scenarios/")
        ? response({}, 503)
        : normalFetch(path, options),
    );
    await mount();
    await searchAndSelect(221);
    expect(
      container.querySelector(".scenario-preview [role=alert]")?.textContent,
    ).toContain("Kunne ikke hente scenariet:");
    expect(
      container.querySelector(".scenario-preview")!.textContent,
    ).not.toContain("Minimum");
    const activate = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Aktivér valgt scenarie",
    )!;
    expect(activate.disabled).toBe(true);
  });
});
