import { useEffect, useState } from "react";
import type { PositionReport } from "../types/v1/position-report";
import type { AppSocket } from "./createSocket";

// Every position report received since the view opened, newest first, for
// the operator view.
export function usePositionReports(socket: AppSocket) {
  const [reports, setReports] = useState<PositionReport[]>([]);

  useEffect(() => {
    function onPositionReport(report: PositionReport) {
      console.log("Position reported:", report);
      // Sort by the server's reportedAt timestamp.
      setReports((previous) =>
        [...previous, report].sort(
          (a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt),
        ),
      );
    }

    socket.on("position-report", onPositionReport);
    return () => {
      socket.off("position-report", onPositionReport);
    };
  }, [socket]);

  return reports;
}
