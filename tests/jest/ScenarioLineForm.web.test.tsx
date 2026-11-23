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
import { ScenarioLineForm } from "../../web/src/components/ScenarioLineForm";

jest.mock("../../web/src/components/StationSelect.css", () => ({}));
describe("scenario line form", () => {
  let container: HTMLDivElement;
  let root: Root;
  const submit = jest.fn<(event: React.FormEvent<HTMLFormElement>) => void>(
    (event) => event.preventDefault(),
  );
  const cancel = jest.fn<() => void>();
  function View({
    editing = false,
    roundtripAllowed = true,
  }: {
    editing?: boolean;
    roundtripAllowed?: boolean;
  }) {
    const [type, setManualType] = useState<"PENDULUM" | "ROUNDTRIP" | null>(
      "ROUNDTRIP",
    );
    const [track, setTrack] = useState<1 | 2>(1);
    const [lineColor, setLineColor] = useState("#FF080B");
    const [did, setDid] = useState("");
    const [maximumTrains, setMaximumTrains] = useState("");
    const [pathIndex, setPathIndex] = useState(0);
    const [stops, updateSelectedStops] = useState(["VAN", "FL"]);
    return (
      <ScenarioLineForm
        from={stops[0]}
        to={stops[1]}
        stations={["VAN", "FL", "LIT"]}
        stationNames={{ VAN: "Vanløse" }}
        updateSelectedStops={updateSelectedStops}
        type={type ?? "ROUNDTRIP"}
        setManualType={setManualType}
        track={track}
        setTrack={setTrack}
        lineColor={lineColor}
        setLineColor={setLineColor}
        did={did}
        setDid={setDid}
        maximumTrains={maximumTrains}
        setMaximumTrains={setMaximumTrains}
        pathIndex={pathIndex}
        setPathIndex={setPathIndex}
        choices={[
          ["VAN", "FL"],
          ["VAN", "LIT", "FL"],
        ]}
        path={["VAN", "FL"]}
        roundtripAllowed={roundtripAllowed}
        turnbacks={{ start: true, end: false }}
        editingRouteId={editing ? 1 : null}
        addLine={submit}
        onCancel={cancel}
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
    submit.mockClear();
    cancel.mockClear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes(text),
    )!;
  async function input(label: string, value: string) {
    const el = [...container.querySelectorAll("label")]
      .find((item) => item.textContent?.includes(label))!
      .querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("selects operation, track and color and enables a completed line", async () => {
    await act(async () => root.render(<View />));
    expect(button("Tilføj linje").disabled).toBe(true);
    await act(async () => button("Pendul").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Spor 2"]')!
        .click(),
    );
    expect(
      container
        .querySelector('button[aria-label="Spor 2"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Lilla"]')!
        .click(),
    );
    expect(container.querySelector(".admin-color-name")?.textContent).toBe(
      "Lilla",
    );
    await input("DID", "TEST");
    await input("Maksimalt antal tog", "2");
    expect(button("Tilføj linje").disabled).toBe(false);
    await act(async () => button("Tilføj linje").click());
    expect(submit).toHaveBeenCalled();
    await act(async () => button("Annuller").click());
    expect(cancel).toHaveBeenCalled();
  });
  it("disallows a two-track line without a turnback and labels edits", async () => {
    await act(async () =>
      root.render(<View editing roundtripAllowed={false} />),
    );
    expect(container.textContent).toContain("Der mangler sporskifte");
    expect(button("Gem ændringer").disabled).toBe(true);
    await act(async () => button("Pendul").click());
    expect(container.textContent).not.toContain("Der mangler sporskifte");
    const select = container.querySelector<HTMLSelectElement>("select")!;
    await act(async () => {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(select.value).toBe("1");
    expect(
      container.querySelector('button[aria-label="Fra station"]'),
    ).toBeNull();
    expect(
      container.querySelector('output[aria-label="Fra station"]')?.textContent,
    ).toContain("VAN");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Til station"]')!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Vælg LIT"]')!
        .click(),
    );
    expect(
      container.querySelector('button[aria-label="Til station"]')?.textContent,
    ).toContain("LIT");
  });
});
