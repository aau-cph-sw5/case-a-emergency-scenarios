import { useState } from "react";
import { useLiveData } from "./data/liveData";
import { postJson, userMessage } from "./get-json";
import { isScenarioState } from "./scenario-state";
import { ConfirmStandDown } from "./ScenarioList";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { formatDuration } from "../../shared/components/statusBar";
import { useNow } from "./useNow";

function startedLabel(startedAt: string) {
  return new Date(startedAt).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ActiveScenarioBanner({ token }: { token: string }) {
  const { activations, scenarios, error, isLoading, isConnected } =
    useLiveData();
  const [confirming, setConfirming] = useState<ScenarioState | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const now = useNow();
  const nameFor = (scenarioId: string) =>
    scenarios?.find((scenario) => scenario.scenarioId === scenarioId)?.name ??
    scenarioId;

  async function standDown(activation: ScenarioState) {
    setConfirming(null);
    if (
      busy ||
      !activations.some((item) => item.activationId === activation.activationId)
    )
      return;
    setBusy(true);
    setActionError(null);
    try {
      await postJson(
        `/api/v1/activations/${activation.activationId}/stand-down`,
        token,
        isScenarioState,
      );
    } catch (failure) {
      setActionError(
        `Kunne ikke deaktivere scenariet: ${userMessage(failure)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="active-banner" aria-label="Aktive scenarier">
      {isLoading && activations.length === 0 ? (
        <div className="active-banner-message" role="status">
          Henter aktive scenarier…
        </div>
      ) : error && activations.length === 0 ? (
        <div
          className="active-banner-message active-banner-message--warning"
          role="alert"
        >
          Kunne ikke hente aktive scenarier: {error}
        </div>
      ) : activations.length === 0 ? (
        <div className="active-banner-idle" role="status">
          <span className="active-banner-indicator" aria-hidden="true" />
          <div>
            <span className="active-banner-label">Scenariestatus</span>
            <strong>Intet aktivt scenarie</strong>
          </div>
        </div>
      ) : (
        <div className="active-banner-list">
          {activations.map((activation) => (
            <div className="active-banner-item" key={activation.activationId}>
              <span className="active-banner-indicator" aria-hidden="true" />
              <div className="active-banner-details">
                <span className="active-banner-label">
                  Aktivt scenarie · startet {startedLabel(activation.startedAt)}
                </span>
                <strong>{nameFor(activation.scenarioId)}</strong>
              </div>
              <span className="active-banner-duration">
                Aktiv i {formatDuration(activation.startedAt, now)}
              </span>
              <button
                type="button"
                className="active-banner-stop"
                disabled={busy}
                onClick={() => setConfirming(activation)}
              >
                Stop scenarie
              </button>
            </div>
          ))}
        </div>
      )}
      {(error || !isConnected) && activations.length > 0 && (
        <p className="active-banner-warning" role="alert">
          {error
            ? `Kunne ikke opdatere: ${error}. `
            : "Forbindelsen er afbrudt. "}
          Status kan være forældet.
        </p>
      )}
      {actionError && (
        <p className="active-banner-warning" role="alert">
          {actionError}
        </p>
      )}
      {confirming && (
        <ConfirmStandDown
          scenario={{
            scenarioId: confirming.scenarioId,
            name: nameFor(confirming.scenarioId),
          }}
          onConfirm={() => void standDown(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </aside>
  );
}
