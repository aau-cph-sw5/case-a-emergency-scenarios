import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  colors,
  palette,
  panelRadius,
  spacing,
  text,
} from "../../../shared/Theme";
import type { IncidentEvents } from "../../../shared/types/v1/incident-events";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { isActivationList } from "../activations";
import { getJson, userMessage } from "../get-json";

type IncidentEvent = IncidentEvents[number];

const EVENT_LABELS: Record<string, string> = {
  SCENARIO_ACTIVATED: "Scenarie aktiveret",
  SCENARIO_STOOD_DOWN: "Scenarie afsluttet",
  POSITION_REPORTED: "Position meldt",
};

const VIEWS = [
  { key: "plain", label: "Liste" },
  { key: "graphic", label: "Grafisk" },
] as const;

function isEventList(data: unknown): data is IncidentEvents {
  return Array.isArray(data);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("da-DK");
}

function GraphicEvent({
  event,
  first,
  last,
}: {
  event: IncidentEvent;
  first: boolean;
  last: boolean;
}) {
  return (
    <View style={{ flexDirection: "row" }}>
      <Text style={{ width: 150, paddingTop: 3 }}>
        {formatTime(event.serverTime)}
      </Text>
      <View
        style={{ flex: 1, paddingLeft: spacing.large, paddingBottom: spacing.large }}
      >
        {!(first && last) && (
          <View
            style={{
              position: "absolute",
              left: -1,
              width: 2,
              top: first ? 11 : 0,
              ...(last ? { height: 11 } : { bottom: 0 }),
              backgroundColor: colors.border,
            }}
          />
        )}
        <View
          style={{
            position: "absolute",
            left: -6,
            top: 5,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: palette.metroLineFour,
          }}
        />
        <Text style={text.title}>{EVENT_LABELS[event.type] ?? event.type}</Text>
        <Text>Af {event.actorRole ?? event.actorType}</Text>
      </View>
    </View>
  );
}

// The "Incident Timeline" is the timeline described in (MET-A-024),
// where an incident can be chosen to see its sequence of events.
export function IncidentTimeline({ token }: { token: string }) {
  const [activations, setActivations] = useState<ScenarioState[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [events, setEvents] = useState<IncidentEvents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"plain" | "graphic">("plain");

  useEffect(() => {
    const controller = new AbortController();
    getJson("/api/v1/activations", token, isActivationList, controller.signal)
      .then(setActivations)
      .catch((err) => {
        if (!controller.signal.aborted) setError(userMessage(err));
      });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    getJson(
      `/api/v1/activations/${selectedId}/events`,
      token,
      isEventList,
      controller.signal,
    )
      .then(setEvents)
      .catch((err) => {
        if (!controller.signal.aborted) setError(userMessage(err));
      });
    return () => controller.abort();
  }, [token, selectedId]);

  const newestFirst = [...activations].sort(
    (a, b) => b.activationId - a.activationId,
  );

  return (
    <View style={{ flexDirection: "row", gap: spacing.large }}>
      <View style={{ width: 260 }}>
        <Text style={text.title}>Hændelser</Text>
        <ul className="scenario-list">
          {newestFirst.map((activation) => (
            <li key={activation.activationId}>
              <button
                type="button"
                className={
                  activation.activationId === selectedId
                    ? "scenario-option is-selected"
                    : "scenario-option"
                }
                onClick={() => {
                  setSelectedId(activation.activationId);
                  setEvents(null);
                  setError(null);
                }}
              >
                {activation.scenarioId}
                <br />
                {formatTime(activation.startedAt)}
                {activation.status === "ACTIVE" && " (aktiv)"}
              </button>
            </li>
          ))}
        </ul>
      </View>

      <View style={{ flex: 1, gap: spacing.small }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={text.title}>Tidslinje</Text>
          <View style={{ flexDirection: "row", gap: spacing.small }}>
            {VIEWS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={view === option.key}
                onClick={() => setView(option.key)}
                style={{
                  padding: `${spacing.small}px ${spacing.medium}px`,
                  border: `1px solid ${colors.border}`,
                  borderRadius: panelRadius,
                  background:
                    view === option.key
                      ? palette.metroBlack
                      : colors.background,
                  color:
                    view === option.key ? colors.textInverse : colors.text,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </View>
        </View>

        {error && <Text style={{ color: colors.statusRed }}>{error}</Text>}
        {events?.length === 0 && <Text>Ingen hændelser registreret.</Text>}
                {view === "plain" &&
          events?.map((event) => (
            <View
              key={event.sequence}
              style={{ flexDirection: "row", gap: spacing.medium }}
            >
              <Text style={{ width: 150 }}>
                {formatTime(event.serverTime)}
              </Text>
                <Text style={{ width: 170 }}>
                {EVENT_LABELS[event.type] ?? event.type}
              </Text>
              <Text>{event.actorRole ?? event.actorType}</Text>
            </View>
          ))}
        {view === "graphic" && (
          <View>
            {events?.map((event, index, all) => (
            <GraphicEvent
                key={event.sequence}
                event={event}
                first={index === 0}
                last={index === all.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
