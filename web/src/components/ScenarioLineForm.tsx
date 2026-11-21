import type { Dispatch, FormEvent, SetStateAction } from "react";
import { StationSelect } from "./StationSelect";
import { routeColors, routeColorNames } from "../admin-line-colors";

type Props = {
  from: string;
  to: string;
  stations: string[];
  stationNames?: Readonly<Record<string, string>>;
  updateSelectedStops: (stops: string[]) => void;
  type: "PENDULUM" | "ROUNDTRIP";
  setManualType: Dispatch<SetStateAction<"PENDULUM" | "ROUNDTRIP" | null>>;
  track: 1 | 2;
  setTrack: Dispatch<SetStateAction<1 | 2>>;
  lineColor: string;
  setLineColor: Dispatch<SetStateAction<string>>;
  did: string;
  setDid: Dispatch<SetStateAction<string>>;
  maximumTrains: string;
  setMaximumTrains: Dispatch<SetStateAction<string>>;
  pathIndex: number;
  setPathIndex: Dispatch<SetStateAction<number>>;
  choices: string[][];
  path?: string[];
  roundtripAllowed: boolean;
  turnbacks: { start: boolean; end: boolean };
  editingRouteId: number | null;
  addLine: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};
export function ScenarioLineForm({
  from,
  to,
  stations,
  stationNames,
  updateSelectedStops,
  type,
  setManualType,
  track,
  setTrack,
  lineColor,
  setLineColor,
  did,
  setDid,
  maximumTrains,
  setMaximumTrains,
  pathIndex,
  setPathIndex,
  choices,
  path,
  roundtripAllowed,
  turnbacks,
  editingRouteId,
  addLine,
  onCancel,
}: Props) {
  return (
    <form className="admin-line-form" onSubmit={addLine}>
      <StationSelect
        label="Fra station"
        value={from}
        stations={stations}
        stationNames={stationNames}
        onChange={(station) => {
          updateSelectedStops([station]);
        }}
      />
      <StationSelect
        label="Til station"
        value={to}
        stations={stations.filter((station) => station !== from)}
        stationNames={stationNames}
        onChange={(station) => {
          updateSelectedStops(from ? [from, station] : [station]);
        }}
      />
      <fieldset className="admin-choice-field">
        <legend>Driftstype</legend>
        <div className="admin-choice">
          {(["PENDULUM", "ROUNDTRIP"] as const).map((operation) => (
            <button
              key={operation}
              type="button"
              aria-pressed={type === operation}
              onClick={() => {
                setManualType(operation);
                setPathIndex(0);
              }}
            >
              {operation === "PENDULUM" ? "Pendul" : "Tosporsdrift"}
            </button>
          ))}
        </div>
      </fieldset>
      {type === "PENDULUM" && (
        <fieldset className="admin-choice-field">
          <legend>Spor</legend>
          <div className="admin-choice">
            {([1, 2] as const).map((number) => (
              <button
                key={number}
                type="button"
                aria-label={`Spor ${number}`}
                aria-pressed={track === number}
                onClick={() => {
                  setTrack(number);
                  setPathIndex(0);
                }}
              >
                {number}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="admin-color-field">
        <legend>Linjefarve</legend>
        <div className="admin-color-options">
          {routeColors.map((color, index) => (
            <button
              key={color}
              type="button"
              className="admin-color-option"
              style={{ backgroundColor: color }}
              aria-label={routeColorNames[index]}
              aria-pressed={lineColor === color}
              title={routeColorNames[index]}
              onClick={() => setLineColor(color)}
            />
          ))}
        </div>
        <span className="admin-color-name" aria-live="polite">
          {routeColorNames[routeColors.indexOf(lineColor)]}
        </span>
      </fieldset>
      <label>
        DID
        <input
          type="text"
          value={did}
          onChange={(event) => setDid(event.target.value)}
          required
        />
      </label>
      <label>
        Maksimalt antal tog
        <input
          type="number"
          min={0}
          max={2147483647}
          step={1}
          value={maximumTrains}
          onChange={(event) => setMaximumTrains(event.target.value)}
          required
        />
      </label>
      {choices.length > 1 && (
        <label className="admin-line-wide">
          Rute
          <select
            value={pathIndex}
            onChange={(event) => setPathIndex(Number(event.target.value))}
          >
            {choices.map((path, index) => (
              <option key={path.join("-")} value={index}>
                {path.join(" → ")}
              </option>
            ))}
          </select>
        </label>
      )}
      {type === "ROUNDTRIP" && path && !roundtripAllowed && (
        <p className="admin-notice admin-line-wide" role="status">
          Tosporsdrift kræver et sporskifte på strækningen lige ved begge
          endestationer. Der mangler sporskifte ved{" "}
          {[!turnbacks.start && from, !turnbacks.end && to]
            .filter(Boolean)
            .join(" og ")}
          .
        </p>
      )}
      {from && to && choices.length === 0 && (
        <p className="admin-notice admin-line-wide">
          Vælg to forskellige stationer med en forbindelse.
        </p>
      )}
      <div className="admin-form-actions admin-line-wide">
        <button
          type="submit"
          className="admin-primary"
          disabled={
            !path ||
            !did.trim() ||
            maximumTrains === "" ||
            !Number.isInteger(Number(maximumTrains)) ||
            Number(maximumTrains) < 0 ||
            Number(maximumTrains) > 2147483647 ||
            (type === "ROUNDTRIP" && !roundtripAllowed)
          }
        >
          {editingRouteId === null ? "Tilføj linje" : "Gem ændringer"}
        </button>
        <button type="button" className="admin-secondary" onClick={onCancel}>
          Annuller
        </button>
      </div>
    </form>
  );
}
