import type { PositionReport } from "../../../shared/types/v1/position-report";
import { colors, text } from "../../../shared/Theme";

// Every position report, newest first, updated live over the socket.
export function StewardPositions({ reports }: { reports: PositionReport[] }) {
  return (
    <section aria-labelledby="positions-heading">
      <h2 id="positions-heading" style={{ ...text.title, color: colors.text }}>
        Stewardpositioner
      </h2>
      {reports.length === 0 ? (
        <p style={{ ...text.header, color: colors.text }}>Ingen positioner endnu.</p>
      ) : (
        <ul style={{ ...text.header, color: colors.text }}>
          {reports.map((report) => (
            <li key={`${report.staff}-${report.reportedAt}`}>
              {report.staff} er ved {report.station}, rapporteret{" "}
              {new Date(report.reportedAt).toLocaleTimeString("da-DK")}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
