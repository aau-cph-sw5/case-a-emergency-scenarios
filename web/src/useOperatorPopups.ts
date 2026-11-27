import { useState } from "react";
import {
  LINE_GROUP_LABELS,
  lineGroupFromLabel,
  type LineGroupLabel,
} from "../../shared/auth/line-groups";
import { lineGroupFromToken } from "../../shared/auth/login";
import { mockStewardPositions } from "./local-settings";
import { useLiveData } from "./data/liveData";

// Selected line group and which dashboard pop-ups are available and open.
export function useOperatorPopups(token: string) {
  const ownLineGroup = lineGroupFromToken(token);
  // The map starts on the operator's own line group.
  const [lineGroup, setLineGroup] = useState<LineGroupLabel>(
    ownLineGroup ? LINE_GROUP_LABELS[ownLineGroup] : "M1/M2",
  );
  // Status and Beskeder only make sense while a scenario is active, so the
  // buttons are not drawn without one (the mock status list stays reachable).
  const { activations } = useLiveData();
  // It follows the line group selected in the top bar, not the operator's own.
  const selectedGroup = lineGroupFromLabel(lineGroup);
  const selectedGroupActive = activations.some(
    (activation) => activation.lineGroup === selectedGroup,
  );
  const showStatus = mockStewardPositions || selectedGroupActive;
  // The messages API is scoped to the line group in the operator's token (it
  // takes no line group), so Beskeder is only offered on the own line group.
  const showMessages = showStatus && ownLineGroup === selectedGroup;
  // Only one pop-up (Status or Beskeder) is open at a time.
  const [openPopup, setOpenPopup] = useState<"status" | "messages" | null>(
    mockStewardPositions ? "status" : null,
  );
  return {
    ownLineGroup,
    lineGroup,
    setLineGroup,
    showStatus,
    showMessages,
    openPopup,
    setOpenPopup,
  };
}
