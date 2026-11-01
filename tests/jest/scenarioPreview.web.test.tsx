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
  activationId: "activation-1",
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
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
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
  it("puts requirements in the right column and the existing activation control on the left", async () => {
    await renderList(first.scenarioId);
    const columns = container.querySelectorAll(".operator-sections > section");
    expect(columns[0].contains(button("Aktivér valgt scenarie"))).toBe(true);
    expect(columns[1].textContent).toContain(
      "Kortvisning er endnu ikke tilgængelig.",
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(columns[2].textContent).toContain("Placering: Platform A");
    expect(columns[2].textContent).toContain("Minimum 2 stewards");
    expect(columns[0].textContent).not.toContain("Placering:");
  });

  it("keeps preview requirements independent of live deployments and their updates", async () => {
    const otherActivation = {
      ...activated,
      scenarioId: second.scenarioId,
      deployments: [{ fulfills: "Station A", status: "MANNED" as const }],
    };
    await renderList(first.scenarioId, { activations: [otherActivation] });
    await renderList(first.scenarioId, {
      activations: [{ ...otherActivation, deployments: [] }],
    });
    const requirements =
      container.querySelector(".scenario-preview")!.textContent!;
    expect(requirements).toContain("Minimum 2 stewards");
    expect(requirements).not.toMatch(
      /\d+\/\d+|på stationen|på vej|Mangler|Fuldt bemandet/,
    );
  });

  it("shows an empty preview and disables activation until a scenario is selected", async () => {
    await renderList();
    expect(container.textContent).toContain(
      "Vælg et scenarie for at se bemandingsbehov.",
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(loadScenario).not.toHaveBeenCalled();
  });

  it("loads the selection without opening confirmation, then shows required coverage", async () => {
    await renderList();
    await click(first.name);
    expect(loadScenario).toHaveBeenCalledWith(first.scenarioId);
    expect(container.querySelector("dialog")).toBeNull();
    expect(button(first.name).getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("Placering: Platform A");
    expect(container.textContent).toContain("1 stationer · 2 stewards kræves");
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
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

  it("shows a failed load without allowing activation", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadScenario.mockRejectedValue(new Error("offline"));
    await renderList(first.scenarioId);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Kunne ikke hente scenariet:",
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(container.textContent).not.toContain("Placering:");
  });

  it("retries a failed preview through the shared loader", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadScenario
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(first);
    await renderList(first.scenarioId);
    await click("Prøv igen");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("Placering: Platform A");
    expect(loadScenario).toHaveBeenCalledTimes(2);
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
  });

  it("shows a clear empty state for a scenario without required stations", async () => {
    loadScenario.mockResolvedValue({
      ...first,
      versions: [{ ...first.versions[0], stationRequirements: [] }],
    });
    await renderList(first.scenarioId);
    expect(container.textContent).toContain(
      "Scenariet kræver ingen stationer.",
    );
    expect(container.textContent).toContain("0 stationer · 0 stewards kræves");
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
  });

  it("ignores a late response after selecting another scenario", async () => {
    const pending = deferred<Scenario>();
    loadScenario
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(second);
    await renderList(first.scenarioId);
    await click(second.name);
    expect(container.textContent).toContain("Placering: Platform B");
    await act(async () => pending.resolve(first));
    expect(container.textContent).toContain("Placering: Platform B");
    expect(container.textContent).not.toContain("Placering: Platform A");
    await click("Aktivér valgt scenarie");
    expect(container.querySelector("dialog")?.textContent).toContain(
      second.name,
    );
  });

  it("hides the previous preview while a new selection is loading, including late failures", async () => {
    const pending = deferred<Scenario>();
    loadScenario
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(pending.promise);
    await renderList(first.scenarioId);
    await click(second.name);
    expect(container.textContent).not.toContain("Placering: Platform A");
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    await click(first.name);
    jest.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => pending.reject(new Error("Old failure")));
    expect(container.textContent).toContain("Placering: Platform A");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("keeps selection when cancelling and makes no activation request", async () => {
    await renderList(first.scenarioId);
    await click("Aktivér valgt scenarie");
    expect(container.querySelector("dialog")?.textContent).toContain(
      first.name,
    );
    await click("Annullér");
    expect(container.querySelector("dialog")).toBeNull();
    expect(button(first.name).getAttribute("aria-pressed")).toBe("true");
    expect(jest.mocked(postJson)).not.toHaveBeenCalled();
  });

  it("activates only the previewed scenario with confirmation, then marks it active", async () => {
    const pending = deferred<ScenarioState>();
    jest.mocked(postJson).mockReturnValue(pending.promise);
    await renderList(first.scenarioId);
    await click("Aktivér valgt scenarie");
    await click("Bekræft");
    expect(jest.mocked(postJson)).toHaveBeenCalledWith(
      `/api/v1/scenarios/${first.scenarioId}/activate`,
      "operator-token",
      expect.any(Function),
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(button(second.name).disabled).toBe(true);
    await act(async () => pending.resolve(activated));
    expect(button(`${first.name} — Aktiv`).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(container.querySelector(".scenario-preview")).toBeNull();
    await click("Aktivér valgt scenarie");
    expect(jest.mocked(postJson)).toHaveBeenCalledTimes(1);
  });

  it("marks already active scenarios and prevents activating them", async () => {
    await renderList(first.scenarioId, { activations: [activated] });
    expect(button(`${first.name} — Aktiv`)).toBeTruthy();
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
    expect(container.querySelector(".scenario-preview")).toBeNull();
    expect(container.textContent).toContain("0/2");
  });

  it("does not activate a scenario made active elsewhere while confirmation is open", async () => {
    await renderList(first.scenarioId);
    await click("Aktivér valgt scenarie");
    await renderList(first.scenarioId, { activations: [activated] });
    await click("Bekræft");
    expect(jest.mocked(postJson)).not.toHaveBeenCalled();
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("keeps the selected preview and shows activation errors so the operator can try again", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(postJson).mockRejectedValue(new Error("offline"));
    await renderList(first.scenarioId);
    await click("Aktivér valgt scenarie");
    await click("Bekræft");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Kunne ikke aktivere scenariet:",
    );
    expect(button(first.name).getAttribute("aria-pressed")).toBe("true");
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
  });

  it("clears the preview if its scenario disappears from the list", async () => {
    await renderList(first.scenarioId);
    await renderList(first.scenarioId, { scenarios: [second] });
    expect(container.textContent).toContain(
      "Vælg et scenarie for at se bemandingsbehov.",
    );
    expect(container.textContent).not.toContain("Placering: Platform A");
    expect(button("Aktivér valgt scenarie").disabled).toBe(true);
  });

  it("keeps the preview when searching hides its selected scenario", async () => {
    await renderList(first.scenarioId);
    const input = container.querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Second");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector("li button")?.textContent).toBe(second.name);
    expect(container.textContent).toContain("Placering: Platform A");
    expect(button("Aktivér valgt scenarie").disabled).toBe(false);
  });
});
