-- Coordinates share the schematic map's coordinate system, not latitude and longitude.
CREATE TABLE station_map_positions (
    station_id INT PRIMARY KEY REFERENCES stations(id) ON DELETE CASCADE,
    x          DOUBLE PRECISION NOT NULL,
    y          DOUBLE PRECISION NOT NULL
);

CREATE TABLE crossover_map_positions (
    crossover_id INT PRIMARY KEY REFERENCES crossovers(id) ON DELETE CASCADE,
    x            DOUBLE PRECISION NOT NULL,
    y            DOUBLE PRECISION NOT NULL
);
