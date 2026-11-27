import { selectTurnbacks } from "../../shared/network/turnbacks";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { areaAroundStations } from "../../shared/scenario/affected-stations";
import {
  resolveSelectedStops,
  resolveSimpleStops,
  resolveStops,
} from "../../shared/network/network";
import { useNetwork } from "./data/useNetwork";
import {
  clearScenarioDraft,
  readScenarioDraft,
  writeScenarioDraft,
} from "./admin-draft";
import { ApiError, postJson, userMessage } from "./get-json";
import {
  validStaffingDays,
  type StationStaffing,
} from "./components/ScenarioStaffing";
import {
  groupLines,
  coverageCandidates,
  groupCrossovers,
  groupStations,
  roundtripTurnbacks,
  type LineGroup,
  type Route,
} from "./admin-routes";
import { routeColors } from "./admin-line-colors";

type AdminView = "home" | "group" | "editor" | "staffing" | "complete";

function isCreatedScenario(value: unknown): value is { scenarioId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { scenarioId?: unknown }).scenarioId === "string"
  );
}

function readAdminLocation(): {
  view: AdminView;
  lineGroup?: LineGroup;
  editingLine?: boolean;
} {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/admin/scenarios/new") return { view: "group" };
  const match = /^\/admin\/scenarios\/new\/(M1_M2|M3_M4)$/.exec(path);
  if (!match) return { view: "home" };
  return {
    view: "editor",
    lineGroup: match[1] === "M1_M2" ? "M1/M2" : "M3/M4",
    editingLine:
      new URLSearchParams(window.location.search).get("line") === "new",
  };
}

export function useScenarioBuilder(token: string) {
  const {
    network,
    error: networkError,
    retry: retryNetwork,
  } = useNetwork(token);
  const [initialDraft] = useState(() => {
    const draft = readScenarioDraft(token);
    const location = readAdminLocation();
    return location.view === "home" ||
      (location.lineGroup && draft?.lineGroup !== location.lineGroup)
      ? null
      : draft;
  });
  const [view, setView] = useState<AdminView>(() => {
    const location = readAdminLocation();
    return location.view === "editor" &&
      !location.editingLine &&
      initialDraft?.view === "staffing"
      ? "staffing"
      : location.view;
  });
  const [lineGroup, setLineGroup] = useState<LineGroup>(
    () => readAdminLocation().lineGroup ?? initialDraft?.lineGroup ?? "M1/M2",
  );
  const [scenarioId, setScenarioId] = useState(
    () => initialDraft?.scenarioId ?? "",
  );
  const [scenarioName, setScenarioName] = useState(
    () => initialDraft?.scenarioName ?? "",
  );
  const [routes, setRoutes] = useState<Route[]>(
    () => initialDraft?.routes ?? [],
  );
  const [staffing, setStaffing] = useState<StationStaffing[]>(
    () => initialDraft?.staffing ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState("");
  const savingRef = useRef(false);
  const [editingLine, setEditingLine] = useState(
    () => readAdminLocation().editingLine ?? initialDraft?.editingLine ?? false,
  );
  const [editingRouteId, setEditingRouteId] = useState<number | null>(
    () => initialDraft?.editingRouteId ?? null,
  );
  const [from, setFrom] = useState(() => initialDraft?.from ?? "");
  const [to, setTo] = useState(() => initialDraft?.to ?? "");
  const [selectedStops, setSelectedStops] = useState<string[]>(
    () =>
      initialDraft?.selectedStops ??
      [initialDraft?.from, initialDraft?.to].filter(
        (station): station is string => Boolean(station),
      ),
  );
  const [manualType, setManualType] = useState<"PENDULUM" | "ROUNDTRIP" | null>(
    () => initialDraft?.manualType ?? null,
  );
  const [track, setTrack] = useState<1 | 2>(() => initialDraft?.track ?? 1);
  const [lineColor, setLineColor] = useState<string>(
    () => initialDraft?.lineColor ?? routeColors[0],
  );
  const [did, setDid] = useState(() => initialDraft?.did ?? "");
  const [maximumTrains, setMaximumTrains] = useState(
    () => initialDraft?.maximumTrains ?? "",
  );
  const [pathIndex, setPathIndex] = useState(
    () => initialDraft?.pathIndex ?? 0,
  );
  const nextIdRef = useRef(
    Math.max(-1, ...(initialDraft?.routes ?? []).map((route) => route.id)) + 1,
  );
  const currentUrlRef = useRef(window.location.href);
  const hasUnsavedChanges =
    view !== "home" &&
    view !== "complete" &&
    Boolean(
      scenarioId.trim() ||
      scenarioName.trim() ||
      routes.length ||
      staffing.length ||
      selectedStops.length ||
      from ||
      to ||
      did.trim() ||
      maximumTrains.trim() ||
      manualType !== null ||
      track !== 1 ||
      lineColor !== routeColors[0] ||
      pathIndex !== 0,
    );
  const confirmDiscard = useCallback(
    () =>
      !hasUnsavedChanges ||
      window.confirm(
        "Vil du forlade scenariet? Dine ændringer bliver slettet.",
      ),
    [hasUnsavedChanges],
  );
  useEffect(() => {
    if (view !== "editor" && view !== "staffing") return;
    writeScenarioDraft(token, {
      lineGroup,
      view,
      editingLine,
      editingRouteId,
      scenarioId,
      scenarioName,
      routes,
      staffing,
      selectedStops,
      from,
      to,
      manualType,
      track,
      lineColor,
      did,
      maximumTrains,
      pathIndex,
    });
  }, [
    token,
    lineGroup,
    view,
    editingLine,
    editingRouteId,
    scenarioId,
    scenarioName,
    routes,
    staffing,
    selectedStops,
    from,
    to,
    manualType,
    track,
    lineColor,
    did,
    maximumTrains,
    pathIndex,
  ]);

  const discardDraft = useCallback(() => {
    clearScenarioDraft(token);
    setScenarioId("");
    setScenarioName("");
    setRoutes([]);
    setStaffing([]);
    setSaveError(null);
    setEditingRouteId(null);
    setFrom("");
    setTo("");
    setSelectedStops([]);
    setManualType(null);
    setTrack(1);
    setLineColor(routeColors[0]);
    setDid("");
    setMaximumTrains("");
    setPathIndex(0);
    nextIdRef.current = 0;
  }, [token]);

  useEffect(() => {
    if (view === "home") clearScenarioDraft(token);
  }, [view, token]);

  useEffect(() => {
    const onPopState = () => {
      const location = readAdminLocation();
      const leavingDraft =
        location.view === "home" ||
        (location.view === "group" &&
          (view === "editor" || view === "staffing"));
      if (leavingDraft && !confirmDiscard()) {
        window.history.pushState(null, "", currentUrlRef.current);
        return;
      }
      currentUrlRef.current = window.location.href;
      if (leavingDraft) discardDraft();
      if (location.lineGroup && location.lineGroup !== lineGroup) {
        setLineGroup(location.lineGroup);
        setRoutes([]);
        setStaffing([]);
        setFrom("");
        setTo("");
        setSelectedStops([]);
        setPathIndex(0);
      }
      setEditingLine(location.editingLine ?? false);
      setView(location.view);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [lineGroup, discardDraft, confirmDiscard, view]);
  const lines = network?.lines ?? [];
  const baseLines = groupLines(lineGroup, lines);
  const stationPositions = network?.positions ?? {};
  const stations = groupStations(lineGroup, lines);
  const mapViewBox = areaAroundStations(
    stations,
    90,
    (station) => stationPositions[station],
  );
  function selectedPath(
    trackNumber: 1 | 2 | 12,
    stops = selectedStops,
  ): string[] | undefined {
    if (stops.length < 2) return undefined;
    const result = resolveSimpleStops(
      stops,
      baseLines,
      network?.segments ?? [],
      trackNumber === 12 ? [1, 2] : [trackNumber],
    );
    return result.incomplete
      ? undefined
      : [stops[0], ...result.connections.map(([, station]) => station)];
  }
  const roundtripPath = selectedPath(12);
  const m3Edges = lines.find((line) => line.name === "M3")?.connections ?? [];
  const isFullRing = (route: string[] | undefined) =>
    Boolean(
      route &&
      route.length === m3Edges.length + 1 &&
      route[0] === route.at(-1) &&
      new Set(route.slice(0, -1)).size === m3Edges.length &&
      route
        .slice(1)
        .every((station, index) =>
          m3Edges.some(
            ([a, b]) =>
              (a === route[index] && b === station) ||
              (b === route[index] && a === station),
          ),
        ),
    );
  const ringClosed = isFullRing(roundtripPath);
  const ringOrder = m3Edges.map(([station]) => station);
  const ringStart = ringOrder.indexOf(selectedStops[0]);
  const ringSelection =
    ringStart < 0
      ? []
      : [
          ...ringOrder.slice(ringStart),
          ...ringOrder.slice(0, ringStart),
        ].filter((station) => selectedStops.includes(station));
  const ringStops = ringSelection.length
    ? [...ringSelection, ringSelection[0]]
    : [];
  const canCloseRing =
    lineGroup === "M3/M4" &&
    selectedStops.length > 2 &&
    selectedStops[0] !== selectedStops.at(-1) &&
    ringSelection.length === selectedStops.length &&
    isFullRing(selectedPath(12, ringStops));
  const roundtripTurn = roundtripTurnbacks(
    lineGroup,
    roundtripPath ?? [],
    baseLines,
    network?.segments,
  );
  const validRoundtrip = Boolean(
    roundtripPath && (ringClosed || (roundtripTurn.start && roundtripTurn.end)),
  );
  const type =
    manualType ??
    (selectedStops.length < 2 || validRoundtrip ? "ROUNDTRIP" : "PENDULUM");
  const chosenPath = type === "ROUNDTRIP" ? roundtripPath : selectedPath(track);
  const choices = chosenPath ? [chosenPath] : [];
  const routeRepeatsStations =
    selectedStops.length > 1 &&
    !chosenPath &&
    !resolveStops(
      selectedStops,
      baseLines,
      network?.segments ?? [],
      type === "ROUNDTRIP" ? [1, 2] : [track],
    ).incomplete;
  const ringStations =
    lines
      .find((line) => line.name === "M3")
      ?.connections.map(([station]) => station) ?? [];
  const path = choices[pathIndex];
  const coverage = coverageCandidates(
    lineGroup,
    lines,
    network?.segments ?? [],
    routes,
  );
  const turnbacks = roundtripTurnbacks(
    lineGroup,
    path ?? [],
    baseLines,
    network?.segments,
  );
  const roundtripAllowed = ringClosed || (turnbacks.start && turnbacks.end);
  const visibleRoutes = routes.filter(
    (route) => !editingLine || route.id !== editingRouteId,
  );
  const mapStops = [
    ...new Set(
      editingLine
        ? selectedStops
        : visibleRoutes.flatMap((route) => route.stops ?? route.stations),
    ),
  ];
  const preview = editingLine && path ? path : null;
  const backgroundLines = baseLines.map((line) => ({
    ...line,
    tracks: [1, 2],
  }));
  const backgroundColors = Object.fromEntries(
    baseLines.map((line) => [line.name, "#d8dddd"]),
  );
  const mapLines = [
    ...baseLines.map(({ name, connections }) => ({
      name,
      connections,
      tracks: [] as number[],
    })),
    ...visibleRoutes.map((route) => ({
      name: `route-${route.id}`,
      tracks: route.track === 12 ? [1, 2] : [route.track],
      connections: route.stations
        .slice(1)
        .map((station, index): [string, string] => [
          route.stations[index],
          station,
        ]),
    })),
    ...(preview
      ? [
          {
            name: "preview",
            tracks: type === "ROUNDTRIP" ? [1, 2] : [track],
            connections: preview
              .slice(1)
              .map((station, index): [string, string] => [
                preview[index],
                station,
              ]),
          },
        ]
      : []),
  ];
  const colors = Object.fromEntries([
    ...visibleRoutes.map((route) => [`route-${route.id}`, route.color]),
    ...(preview ? [["preview", lineColor]] : []),
  ]);
  const mapTurnbackExtensions: {
    from: string;
    toward: string;
    color: string;
  }[] = [];
  const turnbackColors = new Map<string, string>();
  function markTurnbacks(stations: string[], color: string) {
    const selected = selectTurnbacks(
      lineGroup,
      stations,
      baseLines,
      network?.segments,
    );
    for (const turn of [selected.start, selected.end]) {
      if (!turn) continue;
      turnbackColors.set(
        JSON.stringify([...turn.crossover.between].sort()),
        color,
      );
      if (
        turn.extension &&
        !mapTurnbackExtensions.some(
          (item) =>
            item.from === turn.extension![0] &&
            item.toward === turn.extension![1] &&
            item.color === color,
        )
      )
        mapTurnbackExtensions.push({
          from: turn.extension[0],
          toward: turn.extension[1],
          color,
        });
    }
  }
  visibleRoutes.forEach((route) => {
    if (route.type === "ROUNDTRIP") markTurnbacks(route.stations, route.color);
  });
  if (preview && type === "ROUNDTRIP") markTurnbacks(preview, lineColor);
  const mapCrossovers = groupCrossovers(lineGroup).map((crossover) => ({
    stationA: crossover.between[0],
    stationB: crossover.between[1],
    color:
      turnbackColors.get(JSON.stringify([...crossover.between].sort())) ??
      "#252a2c",
  }));

  function navigate(nextView: AdminView, group?: LineGroup, editing = false) {
    const url = new URL(window.location.href);
    const leavingDraft =
      nextView === "home" ||
      (nextView === "group" && (view === "editor" || view === "staffing"));
    if (leavingDraft) {
      if (!confirmDiscard()) return;
      discardDraft();
    }
    url.pathname =
      nextView === "home"
        ? "/admin"
        : nextView === "editor" && group
          ? `/admin/scenarios/new/${group.replace("/", "_")}`
          : "/admin/scenarios/new";
    url.searchParams.delete("admin");
    url.searchParams.delete("lineGroup");
    if (nextView === "editor" && editing) url.searchParams.set("line", "new");
    else url.searchParams.delete("line");
    window.history.pushState(null, "", url);
    currentUrlRef.current = url.href;
    setView(nextView);
    setEditingLine(editing);
  }

  function selectGroup(group: LineGroup) {
    if (group !== lineGroup) {
      setRoutes([]);
      setStaffing([]);
    }
    setLineGroup(group);
    setFrom("");
    setTo("");
    setSelectedStops([]);
    setPathIndex(0);
    navigate("editor", group);
  }

  function resetLineDraft() {
    setEditingRouteId(null);
    setFrom("");
    setTo("");
    setSelectedStops([]);
    setManualType(null);
    setTrack(1);
    setLineColor(routeColors[routes.length % routeColors.length]);
    setDid("");
    setMaximumTrains("");
    setPathIndex(0);
  }

  function startLine(station?: string) {
    resetLineDraft();
    if (station) {
      setFrom(station);
      setSelectedStops([station]);
    }
    navigate("editor", lineGroup, true);
  }

  function editLine(route: Route) {
    setEditingRouteId(route.id);
    const stops = route.stops ?? route.stations;
    const closed = stops.length > 1 && stops[0] === stops.at(-1);
    const path = closed
      ? undefined
      : resolveSelectedStops(
          stops,
          baseLines,
          network?.segments ?? [],
          route.type === "ROUNDTRIP" ? [1, 2] : [route.track],
        );
    const ordered = path ? path.filter((stop) => stops.includes(stop)) : stops;
    setFrom(ordered[0] ?? "");
    setTo(ordered.length > 1 ? ordered.at(-1)! : "");
    setSelectedStops(ordered);
    setManualType(route.type);
    setTrack(route.track === 2 ? 2 : 1);
    setLineColor(route.color);
    setDid(route.did);
    setMaximumTrains(String(route.maximumTrains));
    setPathIndex(0);
    navigate("editor", lineGroup, true);
  }

  function updateSelectedStops(stops: string[], routeChanged = true) {
    let orderedStops = stops;
    if (
      routeChanged &&
      manualType === "ROUNDTRIP" &&
      stops.length > 1 &&
      (stops.length !== selectedStops.length ||
        stops.some((stop, index) => stop !== selectedStops[index]))
    ) {
      const path = selectedPath(12, stops);
      const turns = roundtripTurnbacks(
        lineGroup,
        path ?? [],
        baseLines,
        network?.segments,
      );
      if (!path || (!isFullRing(path) && !(turns.start && turns.end))) {
        setManualType(null);
        const singleTrackPath = resolveSelectedStops(
          stops,
          baseLines,
          network?.segments ?? [],
          [track],
        );
        if (singleTrackPath)
          orderedStops = singleTrackPath.filter((stop) => stops.includes(stop));
      }
    }
    setSelectedStops(orderedStops);
    setFrom(orderedStops[0] ?? "");
    setTo(orderedStops.length > 1 ? orderedStops.at(-1)! : "");
    setPathIndex(0);
  }

  function clearSelectedStops() {
    updateSelectedStops([]);
  }

  function reorderStopsForTracks(tracks: number[]) {
    if (selectedStops.length < 2 || selectedStops[0] === selectedStops.at(-1)) {
      setPathIndex(0);
      return;
    }
    const path = resolveSelectedStops(
      selectedStops,
      baseLines,
      network?.segments ?? [],
      tracks,
    );
    if (path) {
      updateSelectedStops(
        path.filter((stop) => selectedStops.includes(stop)),
        false,
      );
    } else {
      setPathIndex(0);
    }
  }

  function changeOperationType(operation: "PENDULUM" | "ROUNDTRIP") {
    setManualType(operation);
    reorderStopsForTracks(operation === "ROUNDTRIP" ? [1, 2] : [track]);
  }

  function changeTrack(nextTrack: 1 | 2) {
    setTrack(nextTrack);
    reorderStopsForTracks([nextTrack]);
  }

  function selectStation(station: string) {
    if (!editingLine) {
      startLine(station);
      return;
    }
    const stops =
      selectedStops.length > 1 && selectedStops[0] === selectedStops.at(-1)
        ? selectedStops.slice(0, -1)
        : selectedStops;
    const next = stops.includes(station)
      ? stops.filter((item) => item !== station)
      : [...stops, station];
    if (ringClosed && ringOrder.includes(station) && next.length >= 3) {
      const start = next.includes(stops[0]) ? stops[0] : next[0];
      const startIndex = ringOrder.indexOf(start);
      const ordered = [
        ...ringOrder.slice(startIndex),
        ...ringOrder.slice(0, startIndex),
      ].filter((item) => next.includes(item));
      const closed = [...ordered, ordered[0]];
      if (isFullRing(selectedPath(12, closed))) {
        setSelectedStops(closed);
        setFrom(closed[0]);
        setTo(closed[0]);
        setPathIndex(0);
        return;
      }
    }
    if (next.length > 1) {
      const findPath = (tracks: number[]) =>
        resolveSelectedStops(next, baseLines, network?.segments ?? [], tracks);
      const best =
        findPath(type === "ROUNDTRIP" ? [1, 2] : [track]) ??
        (manualType === null ? findPath([track]) : undefined);
      if (best) {
        updateSelectedStops(best.filter((stop) => next.includes(stop)));
        return;
      }
    }
    updateSelectedStops(next);
  }

  function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stations = choices[pathIndex];
    const maxTrains = Number(maximumTrains);
    if (
      !stations ||
      !did.trim() ||
      maximumTrains === "" ||
      !Number.isInteger(maxTrains) ||
      maxTrains < 0 ||
      maxTrains > 2147483647 ||
      (type === "ROUNDTRIP" && !roundtripAllowed)
    )
      return;
    const id = editingRouteId ?? nextIdRef.current++;
    const updated = {
      id,
      from,
      to,
      type,
      track: type === "ROUNDTRIP" ? (12 as const) : track,
      did: did.trim(),
      color: lineColor,
      maximumTrains: maxTrains,
      stations,
      stops: selectedStops,
    };
    setRoutes((previous) =>
      editingRouteId === null
        ? [...previous, updated]
        : previous.map((route) =>
            route.id === editingRouteId ? updated : route,
          ),
    );
    resetLineDraft();
    navigate("editor", lineGroup);
  }

  async function saveScenario() {
    if (
      savingRef.current ||
      !network ||
      network.incomplete ||
      !scenarioId.trim() ||
      !scenarioName.trim() ||
      routes.length === 0
    )
      return;
    if (
      staffing.some((station) =>
        station.tasks.some((task) => !task.instruction.trim()),
      )
    ) {
      setSaveError("Udfyld eller fjern tomme opgaver før scenariet gemmes.");
      return;
    }
    if (
      staffing.some((station) =>
        (station.windows ?? []).some(
          (window) =>
            !validStaffingDays(window.dayPattern) ||
            !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(window.startTime) ||
            !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(window.endTime) ||
            window.startTime === window.endTime,
        ),
      )
    ) {
      setSaveError(
        "Vælg dage og forskellige tidspunkter i intervaller på 15 minutter.",
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await postJson(
        "/api/v1/scenarios",
        token,
        isCreatedScenario,
        {
          scenarioId: scenarioId.trim(),
          name: scenarioName.trim(),
          lineGroup: lineGroup.replace("/", "_"),
          version: "1",
          revision: "1",
          patterns: routes.map((route) => ({
            operationType: route.type,
            trackNumber: route.track,
            did: route.did,
            color: route.color,
            maximumTrains: route.maximumTrains,
            stops: route.stops ?? route.stations,
          })),
          stationRequirements: staffing.map((station) => ({
            station: station.station,
            placement: station.placement.trim(),
            minimumStaffing: station.minimumStaffing,
            activeDuring: (station.windows ?? []).map((window) => ({
              dayPattern: window.dayPattern.trim(),
              startTime: window.startTime,
              endTime: window.endTime,
            })),
            actions: station.tasks.map((task) => task.instruction.trim()),
          })),
          coveredSegmentIds: coverage
            .filter((segment) => !segment.used)
            .map((segment) => segment.id),
        },
      );
      clearScenarioDraft(token);
      setCreatedId(result.scenarioId);
      setView("complete");
    } catch (error) {
      setSaveError(
        error instanceof ApiError && error.status === 409
          ? "Scenarie-ID findes allerede. Vælg et andet ID."
          : userMessage(error),
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function createAnother() {
    discardDraft();
    navigate("group");
  }

  return {
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
    changeOperationType,
    track,
    changeTrack,
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
    routeRepeatsStations,
    ringStations,
    roundtripAllowed,
    backgroundLines,
    backgroundColors,
    mapLines,
    colors,
    mapCrossovers,
    mapTurnbackExtensions,
    mapStops,
    turnbacks,
    discardDraft,
    confirmDiscard,
    navigate,
    selectGroup,
    resetLineDraft,
    startLine,
    editLine,
    updateSelectedStops,
    clearSelectedStops,
    selectStation,
    addLine,
    saveScenario,
    createAnother,
  };
}
