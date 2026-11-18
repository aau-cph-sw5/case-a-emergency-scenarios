import MapRender from "../../shared/MapRenderer";
import { useScenarioBuilder } from "./useScenarioBuilder";
import { ScenarioStaffing } from "./components/ScenarioStaffing";
import { ScenarioLineSidebar } from "./components/ScenarioLineSidebar";
import { ScenarioLineMap } from "./components/ScenarioLineMap";
import { ScenarioLineForm } from "./components/ScenarioLineForm";
import "./AdminDashboard.css";

export function ScenarioBuilder({
  token,
  onLogout,
  onUsers,
}: {
  token: string;
  onLogout: () => void;
  onUsers: () => void;
}) {
  const {
    network,
    networkError,
    retryNetwork,
    view,
    setView,
    lineGroup,
    scenarioId,
    setScenarioId,
    scenarioName,
    setScenarioName,
    routes,
    setRoutes,
    staffing,
    setStaffing,
    saving,
    saveError,
    createdId,
    editingLine,
    editingRouteId,
    from,
    setFrom,
    to,
    setTo,
    selectedStops,
    setSelectedStops,
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
    baseLines,
    stationPositions,
    stations,
    mapViewBox,
    ringStops,
    canCloseRing,
    type,
    choices,
    path,
    ringStations,
    roundtripAllowed,
    backgroundLines,
    backgroundColors,
    mapLines,
    colors,
    mapCrossovers,
    mapStops,
    turnbacks,
    discardDraft,
    navigate,
    selectGroup,
    resetLineDraft,
    startLine,
    editLine,
    updateSelectedStops,
    selectStation,
    addLine,
    saveScenario,
    createAnother,
  } = useScenarioBuilder(token);
  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            M
          </span>
          <strong>Metro Service</strong>
        </div>
        <div className="admin-profile">
          <strong>Admin</strong>
          <button
            className="admin-logout"
            onClick={() => {
              discardDraft();
              setView("home");
              onLogout();
            }}
            type="button"
          >
            Log ud
          </button>
        </div>
      </header>
      {view === "home" && (
        <div className="admin-content">
          <section className="admin-home">
            <h1>Admin</h1>
            <button
              className="admin-primary"
              type="button"
              onClick={() => navigate("group")}
            >
              Opret scenarie
            </button>
            <button className="admin-secondary" type="button" onClick={onUsers}>
              Brugere
            </button>
          </section>
        </div>
      )}
      {view === "complete" && (
        <div className="admin-content" role="status">
          <h1>Scenarie oprettet</h1>
          <p>Scenarie {createdId} er gemt.</p>
          <button
            type="button"
            className="admin-primary"
            onClick={createAnother}
          >
            Opret et nyt scenarie
          </button>
        </div>
      )}
      {view === "group" && (
        <div className="admin-content">
          <section className="admin-group">
            <button
              className="admin-back"
              type="button"
              onClick={() => navigate("home")}
            >
              ← Tilbage
            </button>
            <h1>Opret scenarie</h1>
            <p>Vælg linjegruppe</p>
            {routes.length > 0 && (
              <p className="admin-muted">
                Vælger du en anden linjegruppe, fjernes de oprettede linjer.
              </p>
            )}
            <div className="admin-group-choices">
              <button type="button" onClick={() => selectGroup("M1/M2")}>
                M1 / M2
              </button>
              <button type="button" onClick={() => selectGroup("M3/M4")}>
                M3 / M4
              </button>
            </div>
          </section>
        </div>
      )}
      {view === "staffing" && (
        <ScenarioStaffing
          stations={[
            ...new Set(baseLines.flatMap((line) => line.connections.flat())),
          ]}
          stationNames={network?.stationNames}
          stoppingStations={routes.flatMap(
            (route) => route.stops ?? route.stations,
          )}
          renderMap={(onStationPress, markedStations) => (
            <div className="admin-map" aria-label={`Metrokort ${lineGroup}`}>
              <p className="admin-map-legend">
                <span aria-hidden="true">●</span> Station med stop · Rød:
                bemanding
              </p>
              <div className="admin-map-background" aria-hidden="true">
                <MapRender
                  lines={backgroundLines}
                  colors={backgroundColors}
                  showLineButtons={false}
                  viewBox={mapViewBox}
                  positions={stationPositions}
                  ringStations={ringStations}
                  availableSegments={network?.segments}
                  crossovers={[]}
                />
              </div>
              <div className="admin-map-foreground">
                <MapRender
                  lines={mapLines}
                  colors={colors}
                  showLineButtons={false}
                  viewBox={mapViewBox}
                  positions={stationPositions}
                  ringStations={ringStations}
                  availableSegments={network?.segments}
                  crossovers={mapCrossovers}
                  markedStations={markedStations}
                  stopStations={mapStops}
                  highlightColor="#b42420"
                  onStationPress={onStationPress}
                />
              </div>
            </div>
          )}
          staffing={staffing}
          setStaffing={setStaffing}
          onBack={() => setView("editor")}
          scenarioId={scenarioId}
          setScenarioId={setScenarioId}
          onSave={() => void saveScenario()}
          saving={saving}
          saveError={saveError}
        />
      )}
      {view === "editor" && !network && (
        <div className="admin-content" role="alert">
          <button
            className="admin-back"
            type="button"
            onClick={() => navigate("group")}
          >
            ← Vælg linjegruppe
          </button>
          <p>{networkError ?? "Indlæser metronetværk…"}</p>
          {networkError && (
            <button type="button" onClick={retryNetwork}>
              Prøv igen
            </button>
          )}
        </div>
      )}
      {view === "editor" && network?.incomplete && (
        <div className="admin-content" role="alert">
          <button
            className="admin-back"
            type="button"
            onClick={() => navigate("group")}
          >
            ← Vælg linjegruppe
          </button>
          <p>
            Metronetværket er ufuldstændigt. Kontrollér netværksdata og prøv
            igen.
          </p>
          <button type="button" onClick={retryNetwork}>
            Prøv igen
          </button>
        </div>
      )}
      {view === "editor" && network && !network.incomplete && (
        <div className="admin-workspace">
          <ScenarioLineSidebar
            lineGroup={lineGroup}
            scenarioId={scenarioId}
            setScenarioId={setScenarioId}
            scenarioName={scenarioName}
            setScenarioName={setScenarioName}
            routes={routes}
            editingLine={editingLine}
            onGroup={() => navigate("group")}
            onCreate={() => startLine()}
            onEdit={editLine}
            onRemove={(id) =>
              setRoutes((previous) =>
                previous.filter((route) => route.id !== id),
              )
            }
            onNext={() => setView("staffing")}
          />
          <ScenarioLineMap
            lineGroup={lineGroup}
            editingLine={editingLine}
            from={from}
            to={to}
            selectedStops={selectedStops}
            path={path}
            canCloseRing={canCloseRing}
            onSelectAll={() => {
              if (path) setSelectedStops(path);
            }}
            onCloseRing={() => {
              setSelectedStops(ringStops);
              setFrom(ringStops[0]);
              setTo(ringStops[0]);
              setManualType("ROUNDTRIP");
              setPathIndex(0);
            }}
            onClear={() => {
              setSelectedStops([]);
              setFrom("");
              setTo("");
              setPathIndex(0);
            }}
            backgroundLines={backgroundLines}
            mapLines={mapLines}
            backgroundColors={backgroundColors}
            colors={colors}
            mapViewBox={mapViewBox}
            stationPositions={stationPositions}
            ringStations={ringStations}
            availableSegments={network.segments}
            mapCrossovers={mapCrossovers}
            mapStops={mapStops}
            selectStation={selectStation}
          />
          <aside className="admin-form-panel">
            <h2>
              {editingLine
                ? editingRouteId === null
                  ? "Opret linje"
                  : "Rediger linje"
                : "Linjedetaljer"}
            </h2>
            {editingLine ? (
              <ScenarioLineForm
                from={from}
                to={to}
                stations={stations}
                stationNames={network.stationNames}
                updateSelectedStops={updateSelectedStops}
                type={type}
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
                choices={choices}
                path={path}
                roundtripAllowed={roundtripAllowed}
                turnbacks={turnbacks}
                editingRouteId={editingRouteId}
                addLine={addLine}
                onCancel={() => {
                  resetLineDraft();
                  navigate("editor", lineGroup);
                }}
              />
            ) : (
              <p className="admin-muted">
                Klik på en station på kortet, eller vælg Opret linje.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
