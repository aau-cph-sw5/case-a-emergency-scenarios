import { getDatabase } from "../db/client.js";
import type { Network } from "../../shared/types/v1/network.js";

// One statement gives the map a consistent snapshot of positions and routes.
export async function getNetwork(): Promise<Network> {
  const sql = getDatabase();
  const [row] = await sql<{ network: Network }[]>`
    SELECT json_build_object(
      'stations', COALESCE((
        SELECT json_agg(json_build_object('code', s.code, 'name', s.name,
                 'x', p.x, 'y', p.y) ORDER BY s.code)
        FROM stations s LEFT JOIN station_map_positions p ON p.station_id = s.id
      ), '[]'::json),
      'segments', COALESCE((
        SELECT json_agg(json_build_object('id', t.id, 'trackNumber', t.track_number,
                 'stationA', a.code, 'stationB', b.code) ORDER BY t.id)
        FROM track_segments t
        JOIN stations a ON a.id = t.station_a_id
        JOIN stations b ON b.id = t.station_b_id
      ), '[]'::json),
      'normalPatterns', COALESCE((
        SELECT json_agg(json_build_object('line', op.normal_line,
                 'routeCode', op.route_code, 'operationType', op.operation_type,
                 'trackNumber', op.track_number, 'maximumTrains', op.maximum_trains,
                 'did', op.did,
                 'stops', COALESCE((
                   SELECT json_agg(s.code ORDER BY ls.sequence)
                   FROM line_stops ls JOIN stations s ON s.id = ls.station_id
                   WHERE ls.operating_pattern_id = op.id
                 ), '[]'::json)) ORDER BY op.normal_line, op.id)
        FROM operating_patterns op WHERE op.normal_line IS NOT NULL
      ), '[]'::json)
    ) AS network
  `;
  return row.network;
}
