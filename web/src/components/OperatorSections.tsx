import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./OperatorSections.css";
import { ColourSlotContext } from "./colour-slot";
// Where the start/stop card is drawn: a slot at the bottom of the right column.
// ScenarioList owns the card's state, so it portals into this slot instead of
// the card moving in the markup. Null (tests, no dashboard) means: draw inline.
export const ActionsSlotContext = createContext<HTMLElement | null>(null);

// The operator dashboard is split into three sections: scenario selection, map,
// and steward coverage. OperatorDashboard decides what goes in each.
export function OperatorSections({
  scenarioSelection,
  map,
  coverage,
  mapControls,
  statusPopup,
  messagePanel,
}: {
  scenarioSelection: ReactNode;
  map: ReactNode;
  coverage: ReactNode;
  mapControls?: ReactNode;
  statusPopup?: ReactNode;
  messagePanel?: ReactNode;
}) {
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const [colourSlot, setColourSlot] = useState<HTMLElement | null>(null);
  const coverageRef = useRef<HTMLElement>(null);

  // Tells the CSS how tall the open pop-up (status window or message panel) is,
  // so the column makes room for it and start/stop stays reachable. The pop-up
  // comes and goes, so watch the panel for it. (Driving this from the
  // dashboard's openPopup would need it threaded through ScenarioWorkspace, and
  // the window also resizes and swaps for the closed notice, so observe.)
  useEffect(() => {
    const panel = coverageRef.current;
    if (!panel) return;
    let resize: ResizeObserver | undefined;
    let watched: HTMLElement | null = null;
    const measure = (win: HTMLElement | null) =>
      panel.style.setProperty(
        "--status-window-h",
        `${win ? win.offsetHeight : 0}px`,
      );
    const update = () => {
      const win = panel.querySelector<HTMLElement>(
        '[data-testid="status-window"], .operator-message-panel:not([hidden])',
      );
      measure(win);
      // Panel changes are frequent; only re-watch when the window itself
      // appeared, went away or was replaced.
      if (win === watched) return;
      resize?.disconnect();
      watched = win;
      if (win && typeof ResizeObserver !== "undefined") {
        resize = new ResizeObserver(() => measure(win));
        resize.observe(win);
      }
    };
    const mutations = new MutationObserver(update);
    mutations.observe(panel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    update();
    return () => {
      mutations.disconnect();
      resize?.disconnect();
    };
  }, []);

  return (
    <ActionsSlotContext value={actionsSlot}>
      <ColourSlotContext value={colourSlot}>
        <div className="operator-sections">
          <section className="operator-sidebar" aria-label="Scenario selection">
            {scenarioSelection}
          </section>
          <section className="operator-map-panel" aria-label="Map">
            <div className="map-heading">
              <h1>Oversigt</h1>
              {mapControls}
            </div>
            <div className="map-legend" aria-label="Kortforklaring">
              <span>
                <i className="legend-required" />
                Bemandingsbehov
              </span>
              <span>
                <i className="legend-blocked" />
                Spærret spor
              </span>
              <div ref={setColourSlot} className="map-legend-colour" />
            </div>
            <div className="operator-map-frame">{map}</div>
          </section>
          <section
            ref={coverageRef}
            className="operator-coverage-panel"
            aria-label="Steward coverage"
          >
            <div className="operator-coverage-content">
              <h2 className="coverage-heading">Bemandingsplan</h2>
              {coverage}
            </div>
            <div ref={setActionsSlot} className="operator-actions-slot" />
            {(statusPopup || messagePanel) && (
              <div className="operator-status-footer">
                <div className="status-popup">{statusPopup}</div>
                {messagePanel}
              </div>
            )}
          </section>
        </div>
      </ColourSlotContext>
    </ActionsSlotContext>
  );
}
