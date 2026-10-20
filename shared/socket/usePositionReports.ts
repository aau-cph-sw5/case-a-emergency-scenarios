import { useEffect, useState } from "react";
import type { PositionReport } from "../types/v1/position-report";
import type { AppSocket } from "./createSocket";

// The latest position per steward, for the operator view.
export function usePositionReports(socket: AppSocket) {
  const [positions, setPositions] = useState<Record<string, PositionReport>>(
    {},
  );

  useEffect(() => {
    function onPositionReport(report: PositionReport) {
      console.log("Position reported:", report);
      setPositions((previous) => {
        const current = previous[report.staff];
        // Keep the newest report
        if (current && current.reportedAt > report.reportedAt) return previous;
        return { ...previous, [report.staff]: report };
      });
    }

    socket.on("position-report", onPositionReport);
    return () => {
      socket.off("position-report", onPositionReport);
    };
  }, [socket]);

  return positions;
}
