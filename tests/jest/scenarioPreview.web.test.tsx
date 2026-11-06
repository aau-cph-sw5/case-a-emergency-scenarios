import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { ScenarioWorkspace } from "../../web/src/components/ScenarioWorkspace";
import { LiveDataContext, type LiveData } from "../../web/src/data/liveData";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { postJson } from "../../web/src/get-json";

jest.mock("../../web/src/components/OperatorSections.css", () => ({}));
jest.mock("../../web/src/components/MetroMap", () => ({
  MetroMap: () => null,
}));

jest.mock("../../web/src/get-json", () => ({
  ...jest.requireActual<typeof import("../../web/src/get-json")>(
    "../../web/src/get-json",
  ),
  postJson: jest.fn(),
}));

const first: Scenario = {
  scenarioId: "TEST-001",
  name: "First scenario",
  currentVersion: "1",
  versions: [
    {
      version: "1",
      revision: "Test",
      operatingPlan: { name: "Test", patterns: [] },
      stationRequirements: [
        { station: "Station A", placement: "Platform A", minimumStaffing: 2 },
      ],
    },
  ],
};
const second: Scenario = {
  ...first,
  scenarioId: "TEST-002",
  name: "Second scenario",
  versions: [
    {
      ...first.versions[0],
      stationRequirements: [
        { station: "Station B", placement: "Platform B", minimumStaffing: 1 },
      ],
    },
  ],
};
const activated: ScenarioState = {
  activationId: 1,
  scenarioId: first.scenarioId,
  status: "ACTIVE",
  startedAt: "2026-11-01T12:00:00Z",
  actor: "operator-test",
  deployments: [],
};
const live: LiveData = {
  scenarios: [first, second],
  activations: [],
  isConnected: true,
  isLoading: false,
  lastUpdatedAt: null,
  error: null,
  scenariosError: null,
  reloadScenarios: () => {},
};
let container: HTMLDivElement;
let root: Root;
const loadScenario = jest.fn<(id: string) => Promise<Scenario>>();

function Harness({ initialId = null }: { initialId?: string | null }) {
  const [selectedId, onSelect] = useState(initialId);
  return (
    <ScenarioWorkspace
      token="operator-token"
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

async function renderList(
  initialId: string | null = null,
  overrides: Partial<LiveData> = {},
) {
  await act(async () => {
    root.render(
      <LiveDataContext
        value={{ live: { ...live, ...overrides }, loadScenario }}
      >
        <Harness initialId={initialId} />
      </LiveDataContext>,
    );
  });
}

function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === name,
  );
  if (!found) throw new Error(`No button: ${name}`);
  return found;
}
async function click(name: string) {
  await act(async () => button(name).click());
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  loadScenario.mockImplementation(async (id) =>
    id === first.scenarioId ? first : second,
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  // jsdom has no modal implementation. Keep close behaviour for Cancel.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

describe("scenario preview and activation", () => {
  it("hides the picker while active, keeps stand-down available without a selection, and restores the picker afterwards", async () => {
    await renderList(null, { activations: [activated] });
    expect(
      container.querySelector<HTMLElement>(".scenario-picker")?.hidden,
    ).toBe(true);
    expect(button("Deaktivér valgt scenarie").disabled).toBe(false);
    await click("Deaktivér valgt scenarie");
    expect(container.querySelector("dialog")?.textContent).toContain(
      first.name,
    );
    jest
      .mocked(postJson)
      .mockResolvedValue({ ...activated, status: "STOOD_DOWN" });
    await click("Deaktivér");
    expect(jest.mocked(postJson)).toHaveBeenCalledWith(
      `/api/v1/activations/${activated.activationId}/stand-down`,
      "operator-token",
      expect.any(Function),
    );
    await renderList(null, { activations: [] });
    expect(
      container.querySelector<HTMLElement>(".scenario-picker")?.hidden,
    ).toBe(false);
  });

  it("puts requirements in the right column and the existing activation control on the left", async () => {
    await renderList(first.scenarioId);
    const columns = container.querySelectorAll(".operator-sections > section");
    expect(columns[0].contains(button("Aktivér valgt scenarie"))).toBe(true);
    expect(columns[2].textContent).toContain("Station A");
    expect(columns[2].textContent).toContain("Nødvendige stewards: 2");
    expect(columns[2].textContent).not.toContain("Placering:");
    expect(columns[2].textContent).not.toMatch(
      /\d+\/\d+|på stationen|på vej|Mangler|Fuldt bemandet/,
    );
    expect(columns[0].textContent).not.toContain("Placering:");
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("shows an empty preview and disables activation until a scenario is selected", async () => {
    await renderList();
    expect(container.textContent).toContain(
      "Vælg et scenarie for at se bemandingsbehov.",
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(loadScenario).not.toHaveBeenCalled();
  });

  it("shows loading and keeps activation disabled while the preview is fetched", async () => {
    const pending = deferred<Scenario>();
    loadScenario.mockReturnValue(pending.promise);
    await renderList(first.scenarioId);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Henter scenarie…",
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    await act(async () => pending.resolve(first));
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
  });

  it("shows a load error with activation disabled, then retries the preview", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadScenario
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(first);
    await renderList(first.scenarioId);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Kunne ikke hente scenariet:",
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    await click("Prøv igen");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector(".scenario-preview")?.textContent).toContain(
      "Station A",
    );
    expect(loadScenario).toHaveBeenCalledTimes(2);
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
  });

  it("ignores a late response after selecting another scenario", async () => {
    const pending = deferred<Scenario>();
    loadScenario
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(second);
    await renderList(first.scenarioId);
    await click(second.name);
    expect(container.querySelector(".scenario-preview")?.textContent).toContain(
      "Station B",
    );
    await act(async () => pending.resolve(first));
    expect(container.querySelector(".scenario-preview")?.textContent).toContain(
      "Station B",
    );
    expect(
      container.querySelector(".scenario-preview")?.textContent,
    ).not.toContain("Station A");
    await click("Aktivér valgt scenarie");
    expect(container.querySelector("dialog")?.textContent).toContain(
      second.name,
    );
  });

  it("activates only the previewed scenario with confirmation, then marks it active", async () => {
    const pending = deferred<ScenarioState>();
    jest.mocked(postJson).mockReturnValue(pending.promise);
    await renderList(first.scenarioId);
    await click("Aktivér valgt scenarie");
    expect(container.querySelector("dialog")?.textContent).toContain(
      first.name,
    );
    expect(jest.mocked(postJson)).not.toHaveBeenCalled();
    expect(
      [...container.querySelectorAll("dialog .confirm-actions button")].map(
        (item) => item.textContent,
      ),
    ).toEqual(["Annullér", "Bekræft"]);
    expect(container.querySelector("dialog .confirm-accept")).not.toBeNull();
    expect(container.querySelector("dialog .confirm-cancel")).not.toBeNull();
    await click("Annullér");
    expect(container.querySelector("dialog")).toBeNull();
    await click("Aktivér valgt scenarie");
    await click("Bekræft");
    expect(jest.mocked(postJson)).toHaveBeenCalledWith(
      `/api/v1/scenarios/${first.scenarioId}/activate`,
      "operator-token",
      expect.any(Function),
      undefined,
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(button(second.name).disabled).toBe(true);
    await act(async () => pending.resolve(activated));
    expect(button(first.name).getAttribute("aria-pressed")).toBe("true");
    // Coverage changes only when the shared activations reload arrives.
    expect(container.querySelector(".scenario-preview")).not.toBeNull();
    await renderList(first.scenarioId, { activations: [activated] });
    expect(container.querySelector(".scenario-preview")).toBeNull();
    expect(jest.mocked(postJson)).toHaveBeenCalledTimes(1);
  });

  it("keeps live coverage visible while previewing another scenario and clears it on stand-down", async () => {
    await renderList(first.scenarioId, { activations: [activated] });
    expect(button("Deaktivér valgt scenarie").disabled).toBe(false);
    expect(container.querySelector(".scenario-preview")).toBeNull();
    expect(container.textContent).toContain("0/2");
    await click(second.name);
    expect(container.textContent).toContain("0/2");
    expect(container.querySelector(".scenario-preview")?.textContent).toContain(
      "Station B",
    );
    expect(
      container.querySelector(".scenario-preview")?.textContent,
    ).not.toMatch(/\d+\/\d+|på stationen|på vej|Mangler|Fuldt bemandet/);
    await renderList(second.scenarioId, { activations: [] });
    expect(container.textContent).not.toContain("0/2");
    expect(container.querySelector(".scenario-preview")?.textContent).toContain(
      "Station B",
    );
  });
});
