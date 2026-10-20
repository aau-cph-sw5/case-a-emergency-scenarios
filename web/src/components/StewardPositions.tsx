import type { PositionReport } from "../../../shared/types/v1/position-report";

// The latest position of each steward, updated live over the socket.
export function StewardPositions({ reports }: { reports: PositionReport[] }) {
  return (
    <section aria-labelledby="positions-heading">
      <h2 id="positions-heading">Stewardpositioner</h2>
      {reports.length === 0 ? (
        <p>Ingen positioner endnu.</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.staff}>
              {report.staff} er ved {report.station}, rapporteret{" "}
              {new Date(report.reportedAt).toLocaleTimeString("da-DK")}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
