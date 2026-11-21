import MapRender from "../../../shared/MapRenderer";
import type { LineGroup } from "../admin-routes";
type MapProps = Parameters<typeof MapRender>[0];
type Props = {
  lineGroup: LineGroup;
  editingLine: boolean;
  from: string;
  to: string;
  selectedStops: string[];
  path?: string[];
  canCloseRing: boolean;
  onSelectAll: () => void;
  onCloseRing: () => void;
  onClear: () => void;
  backgroundLines: MapProps["lines"];
  mapLines: MapProps["lines"];
  backgroundColors: MapProps["colors"];
  colors: MapProps["colors"];
  mapViewBox?: string;
  stationPositions: MapProps["positions"];
  ringStations: string[];
  availableSegments: MapProps["availableSegments"];
  mapCrossovers: MapProps["crossovers"];
  mapStops: string[];
  selectStation: (station: string) => void;
};
export function ScenarioLineMap({
  lineGroup,
  editingLine,
  from,
  to,
  selectedStops,
  path,
  canCloseRing,
  onSelectAll,
  onCloseRing,
  onClear,
  backgroundLines,
  mapLines,
  backgroundColors,
  colors,
  mapViewBox,
  stationPositions,
  ringStations,
  availableSegments,
  mapCrossovers,
  mapStops,
  selectStation,
}: Props) {
  return (
    <section className="admin-map-panel" aria-label="Kort">
      <h2>Oversigt</h2>
      <p className="admin-map-instruction" aria-live="polite">
        {!editingLine
          ? "Klik på en station for at starte en linje."
          : !from
            ? "Vælg linjens startstation på kortet."
            : !to
              ? `Start: ${from}. Klik på næste station, hvor toget skal standse.`
              : `Valgt: ${selectedStops.join(" → ")}. Klik på en station for at vælge eller fjerne den.`}
      </p>
      <div className="admin-map" aria-label={`Metrokort ${lineGroup}`}>
        <p className="admin-map-legend">
          <span aria-hidden="true">●</span>{" "}
          {editingLine ? "Stop på linjen" : "Station med stop"}
        </p>
        {editingLine && selectedStops.length > 0 && (
          <div className="admin-selected-stops">
            {path?.some((station) => !selectedStops.includes(station)) && (
              <button type="button" onClick={onSelectAll}>
                Vælg alle
              </button>
            )}
            <details>
              <summary>{new Set(selectedStops).size} stationer valgt</summary>
              <p>{selectedStops.join(" → ")}</p>
            </details>
            {canCloseRing && (
              <button type="button" onClick={onCloseRing}>
                Luk M3-ringen
              </button>
            )}
            <button type="button" onClick={onClear}>
              Ryd valg
            </button>
          </div>
        )}
        <div className="admin-map-background" aria-hidden="true">
          <MapRender
            key={lineGroup}
            lines={backgroundLines}
            colors={backgroundColors}
            showLineButtons={false}
            viewBox={mapViewBox}
            positions={stationPositions}
            ringStations={ringStations}
            availableSegments={availableSegments}
            crossovers={[]}
          />
        </div>
        <div className="admin-map-foreground">
          <MapRender
            key={`scenario-${lineGroup}`}
            lines={mapLines}
            colors={colors}
            showLineButtons={false}
            viewBox={mapViewBox}
            positions={stationPositions}
            ringStations={ringStations}
            availableSegments={availableSegments}
            crossovers={mapCrossovers}
            markedStations={editingLine ? selectedStops : []}
            stopStations={mapStops}
            highlightColor="#b42420"
            onStationPress={selectStation}
          />
        </div>
      </div>
    </section>
  );
}
