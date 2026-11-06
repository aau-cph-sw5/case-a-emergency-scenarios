import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, jest } from "@jest/globals";
import { ActiveScenarioBanner } from "../../web/src/ActiveScenarioBanner";
import { LiveDataContext, type LiveData } from "../../web/src/data/liveData";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

const activation: ScenarioState = {
  activationId: 42,
  scenarioId: "S1",
  status: "ACTIVE",
  startedAt: "2026-11-05T12:00:00Z",
  actor: "operator",
  deployments: [],
};
const live: LiveData = {
  activations: [],
  scenarios: [{ scenarioId: "S1", name: "Test scenario" }],
  isConnected: true,
  isLoading: false,
  lastUpdatedAt: null,
  error: null,
  scenariosError: null,
  reloadScenarios: () => {},
};
let container: HTMLDivElement;
let root: Root;
let originalFetch: typeof fetch;

async function renderBanner(data: LiveData) {
  await act(async () =>
    root.render(
      <LiveDataContext
        value={{ live: data, loadScenario: async () => ({}) as Scenario }}
      >
        <ActiveScenarioBanner token="token" />
      </LiveDataContext>,
    ),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  originalFetch = globalThis.fetch;
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  globalThis.fetch = originalFetch;
});

it("shows the idle state without a stop action", async () => {
  await renderBanner(live);
  expect(container.textContent).toContain("Intet aktivt scenarie");
  expect(container.querySelector("button")).toBeNull();
});

it("confirms before stopping the specific active activation", async () => {
  const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    json: async () => ({ ...activation, status: "STOOD_DOWN" }),
  } as Response);
  globalThis.fetch = fetchMock;
  await renderBanner({ ...live, activations: [activation] });
  expect(container.textContent).toContain("Test scenario");
  expect(
    container.querySelector(".active-banner-duration")?.textContent,
  ).toMatch(/Aktiv i \d{2,}:\d{2}:\d{2}/);
  await act(async () =>
    container.querySelector<HTMLButtonElement>(".active-banner-stop")!.click(),
  );
  expect(fetchMock).not.toHaveBeenCalled();
  expect(container.querySelector("dialog")?.textContent).toContain(
    "Test scenario",
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>(".confirm-danger")!.click(),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/activations/42/stand-down",
    expect.objectContaining({
      method: "POST",
      headers: { Authorization: "Bearer token" },
    }),
  );
});
