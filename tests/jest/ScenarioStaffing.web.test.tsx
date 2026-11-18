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
import {
  ScenarioStaffing,
  type StationStaffing,
} from "../../web/src/components/ScenarioStaffing";

jest.mock("../../web/src/components/ScenarioStaffingControls.css", () => ({}));
jest.mock("../../web/src/components/StationSelect.css", () => ({}));
describe("scenario staffing editor", () => {
  let root: Root;
  let container: HTMLDivElement;
  const onSave = jest.fn<() => void>();
  const onBack = jest.fn<() => void>();
  function View({ initial = [] }: { initial?: StationStaffing[] }) {
    const [staffing, setStaffing] = useState(initial);
    const [id, setId] = useState("");
    return (
      <ScenarioStaffing
        stations={["VAN", "FL"]}
        stationNames={{ VAN: "Vanløse" }}
        stoppingStations={["VAN"]}
        staffing={staffing}
        setStaffing={setStaffing}
        scenarioId={id}
        setScenarioId={setId}
        onSave={onSave}
        onBack={onBack}
        saving={false}
        saveError={null}
        renderMap={(select, marked) => (
          <div>
            <span data-testid="marked">{marked.join(",")}</span>
            {["VAN", "FL"].map((station) => (
              <button
                key={station}
                type="button"
                onClick={() => select(station)}
              >
                Kort {station}
              </button>
            ))}
          </div>
        )}
      />
    );
  }
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    onSave.mockClear();
    onBack.mockClear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes(text),
    )!;
  async function inputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("adds, edits and removes staffing without changing other stations", async () => {
    await act(async () => root.render(<View />));
    expect(container.textContent).toContain("Ingen stationer valgt endnu");
    expect(button("Gem scenarie").disabled).toBe(true);
    await act(async () => button("Kort VAN").click());
    expect(container.querySelector('[data-testid="marked"]')?.textContent).toBe(
      "VAN",
    );
    expect(container.textContent).not.toContain(
      "Ingen af scenariets linjer standser her",
    );
    const count = container.querySelector<HTMLInputElement>(
      'input[type="number"]',
    )!;
    await inputValue(count, "2");
    expect(container.textContent).toContain("2 medarbejdere");
    await inputValue(
      container.querySelector<HTMLInputElement>(
        'input[placeholder="F.eks. ved rulletrappen"]',
      )!,
      "Perron",
    );
    await act(async () => button("Tilføj opgave").click());
    await inputValue(
      container.querySelector<HTMLInputElement>(
        'input[placeholder^="F.eks. hjælp"]',
      )!,
      "Hjælp rejsende",
    );
    await act(async () => button("Tilføj valgte opgaver").click());
    expect(
      container.querySelector<HTMLInputElement>(".admin-task-row input")?.value,
    ).toBe("Hjælp rejsende");
    await act(async () => button("Tilføj bemandingstid").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Fra dag for bemandingstid 1 på VAN"]',
        )!
        .click(),
    );
    await act(async () => button("Mandag").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Til dag for bemandingstid 1 på VAN"]',
        )!
        .click(),
    );
    await act(async () => button("Fredag").click());
    await inputValue(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Fra for bemandingstid 1 på VAN"]',
      )!,
      "0700",
    );
    await inputValue(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Til for bemandingstid 1 på VAN"]',
      )!,
      "0900",
    );
    await act(async () => button("Kort FL").click());
    expect(container.textContent).toContain(
      "Ingen af scenariets linjer standser her",
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-staffing-nav button[title="Vanløse"]',
        )!
        .click(),
    );
    expect(
      container.querySelector<HTMLInputElement>(
        'input[placeholder="F.eks. ved rulletrappen"]',
      )?.value,
    ).toBe("Perron");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Fra for bemandingstid 1 på VAN"]',
      )?.value,
    ).toBe("07:00");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Fjern bemandingstid 1 for VAN"]',
        )!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Fjern opgave 1 for VAN"]',
        )!
        .click(),
    );
    await act(async () => button("Kort FL").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Fjern bemanding for FL"]',
        )!
        .click(),
    );
    expect(container.querySelector('[data-testid="marked"]')?.textContent).toBe(
      "VAN",
    );
    await inputValue(
      container.querySelector<HTMLInputElement>(
        'input[placeholder="Indtast scenarie-ID"]',
      )!,
      "TEST",
    );
    await act(async () => button("Gem scenarie").click());
    await act(async () => button("Tilbage til linjer").click());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
  it("opens a previously staffed station on return", async () => {
    await act(async () =>
      root.render(
        <View
          initial={[
            { station: "VAN", placement: "", minimumStaffing: 1, tasks: [] },
          ]}
        />,
      ),
    );
    expect(
      container.querySelector(".admin-staffing-station strong")?.textContent,
    ).toBe("VAN");
  });
});
