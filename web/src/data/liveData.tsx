import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppSocket } from "../../../shared/socket/createSocket";
import { useSocketState } from "../../../shared/socket/useSocketState";
import type { Scenario } from "../../../shared/types/v1/scenario";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { fetchActiveActivations } from "../activations";
import { userMessage } from "../get-json";
import {
  fetchScenario,
  fetchScenarios,
  type ScenarioSummary,
} from "../scenarios";

// What every component inside LiveDataProvider reads with useLiveData().
export type LiveData = {
  // Every activation with status ACTIVE, with its deployments. [] when
  // nothing is active.
  activations: ScenarioState[];
  // Every scenario's id and name, loaded once per login. null until loaded.
  scenarios: ScenarioSummary[] | null;
  // False while the socket is down. activations may then be out of date.
  isConnected: boolean;
  // True until activations have been loaded once, so "loading" can be told
  // apart from "nothing active".
  isLoading: boolean;
  // When activations last arrived from the server. null before that.
  lastUpdatedAt: Date | null;
  // A message for the operator when the last load of activations failed.
  // The activations from the last load that worked stay.
  error: string | null;
  // A message for the operator when the scenario list could not be loaded.
  scenariosError: string | null;
  // Loads the scenario list again, for the operator's "try again" after a
  // failed load. The newest call wins.
  reloadScenarios: () => void;
};

// useScenario() reads loadScenario; components read live through useLiveData().
type LiveContext = {
  live: LiveData;
  loadScenario: (scenarioId: string) => Promise<Scenario>;
};

// One request per scenario id, shared by every useScenario(). The request is
// kept rather than the answer, so two components asking at the same time share
// one request. A failed request is forgotten, so the next ask tries again.
// LiveDataProvider makes a new loader per login.
function scenarioLoader(token: string) {
  const requests = new Map<string, Promise<Scenario>>();
  return (scenarioId: string) => {
    let request = requests.get(scenarioId);
    if (request === undefined) {
      request = fetchScenario(token, scenarioId);
      requests.set(scenarioId, request);
      request.catch(() => requests.delete(scenarioId));
    }
    return request;
  };
}

// Exported for tests, which provide a value directly instead of a server.
export const LiveDataContext = createContext<LiveContext | null>(null);

// Loads the server data for the control room once and hands it to every
// component inside it. App puts it around the banner and the dashboard, so no
// component fetches or listens to the socket itself.
export function LiveDataProvider({
  socket,
  token,
  children,
}: {
  socket: AppSocket;
  token: string;
  children: ReactNode;
}) {
  const { isConnected } = useSocketState(socket);
  const [activations, setActivations] = useState<ScenarioState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [activationsError, setActivationsError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  // The active activations. Loaded on login, on every "activations-changed"
  // and on every (re)connect, so changes missed while the socket was down are
  // caught up. The event carries no data, so this load is the only way the
  // state changes, and nothing polls.
  useEffect(() => {
    const controller = new AbortController();
    // Only the newest load may set state, so a slow older answer cannot
    // overwrite a newer one.
    let latest = 0;
    async function load() {
      const mine = ++latest;
      try {
        const loaded = await fetchActiveActivations(token, controller.signal);
        if (mine !== latest) return;
        setActivations(loaded);
        setLastUpdatedAt(new Date());
        setActivationsError(null);
      } catch (e) {
        if (controller.signal.aborted || mine !== latest) return;
        console.error(e);
        setActivationsError(userMessage(e));
      } finally {
        if (mine === latest) setIsLoading(false);
      }
    }
    socket.on("connect", load);
    socket.on("activations-changed", load);
    load();
    return () => {
      controller.abort();
      socket.off("connect", load);
      socket.off("activations-changed", load);
    };
  }, [socket, token]);

  // The scenario list does not change while the app runs, so it is loaded
  // once per login, and again only when the operator asks after a failure.
  const scenariosLoadRef = useRef<AbortController | null>(null);
  const reloadScenarios = useCallback(() => {
    // Aborting the older load makes its answer count as ignored, so a slow
    // older answer cannot overwrite a newer one.
    scenariosLoadRef.current?.abort();
    const controller = new AbortController();
    scenariosLoadRef.current = controller;
    fetchScenarios(token, controller.signal).then(
      (loaded) => {
        if (controller.signal.aborted) return;
        setScenarios(loaded);
        setScenariosError(null);
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setScenariosError(userMessage(e));
      },
    );
  }, [token]);
  useEffect(() => {
    reloadScenarios();
    return () => scenariosLoadRef.current?.abort();
  }, [reloadScenarios]);

  const loadScenario = useMemo(() => scenarioLoader(token), [token]);

  const value = useMemo(
    () => ({
      live: {
        activations,
        scenarios,
        isConnected,
        isLoading,
        lastUpdatedAt,
        error: activationsError,
        scenariosError,
        reloadScenarios,
      },
      loadScenario,
    }),
    [
      activations,
      scenarios,
      isConnected,
      isLoading,
      lastUpdatedAt,
      activationsError,
      scenariosError,
      reloadScenarios,
      loadScenario,
    ],
  );

  return <LiveDataContext value={value}>{children}</LiveDataContext>;
}

export function useLiveContext(): LiveContext {
  const context = use(LiveDataContext);
  if (context === null) {
    throw new Error("useLiveData() is used outside <LiveDataProvider>");
  }
  return context;
}

export function useLiveData(): LiveData {
  return useLiveContext().live;
}
