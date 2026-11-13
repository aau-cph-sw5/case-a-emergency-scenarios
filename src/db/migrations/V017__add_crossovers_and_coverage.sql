-- Each row is one independently unavailable physical connection. Positions
-- run from 0 at station A to 1 at station B of the corresponding segment.
CREATE TABLE crossovers (
    id                    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_track_segment_id INT NOT NULL REFERENCES track_segments(id) ON DELETE RESTRICT,
    from_position         NUMERIC NOT NULL CHECK (from_position BETWEEN 0 AND 1),
    to_track_segment_id   INT NOT NULL REFERENCES track_segments(id) ON DELETE RESTRICT,
    to_position           NUMERIC NOT NULL CHECK (to_position BETWEEN 0 AND 1),
    CHECK (from_track_segment_id <> to_track_segment_id)
);

-- Lock the referenced segments while validating, including when the shared
-- application role creates a crossover without permission to update tracks.
CREATE FUNCTION validate_crossover_tracks() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    from_number INT;
    to_number INT;
BEGIN
    PERFORM id FROM public.track_segments
    WHERE id IN (NEW.from_track_segment_id, NEW.to_track_segment_id)
    ORDER BY id FOR SHARE;

    SELECT track_number INTO from_number FROM public.track_segments
    WHERE id = NEW.from_track_segment_id;
    SELECT track_number INTO to_number FROM public.track_segments
    WHERE id = NEW.to_track_segment_id;

    IF from_number = to_number THEN
        RAISE EXCEPTION 'A crossover must connect different track numbers'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER crossovers_validate_tracks
    BEFORE INSERT OR UPDATE OF from_track_segment_id, to_track_segment_id ON crossovers
    FOR EACH ROW EXECUTE FUNCTION validate_crossover_tracks();

-- Do not allow later segment edits to invalidate a saved crossover.
CREATE FUNCTION validate_track_crossover_changes() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
    IF (NEW.station_a_id IS DISTINCT FROM OLD.station_a_id
        OR NEW.station_b_id IS DISTINCT FROM OLD.station_b_id) AND EXISTS (
        SELECT 1 FROM public.crossovers
        WHERE from_track_segment_id = NEW.id OR to_track_segment_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Cannot change station endpoints while a crossover references the segment'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.track_number IS DISTINCT FROM OLD.track_number AND EXISTS (
        SELECT 1
        FROM public.crossovers c
        JOIN public.track_segments other ON other.id = CASE
            WHEN c.from_track_segment_id = NEW.id THEN c.to_track_segment_id
            ELSE c.from_track_segment_id
        END
        WHERE (c.from_track_segment_id = NEW.id OR c.to_track_segment_id = NEW.id)
          AND other.track_number = NEW.track_number
    ) THEN
        RAISE EXCEPTION 'Track number would invalidate a crossover'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER track_segments_validate_crossovers
    BEFORE UPDATE OF track_number, station_a_id, station_b_id ON track_segments
    FOR EACH ROW EXECUTE FUNCTION validate_track_crossover_changes();

-- Reversing the endpoints describes the same physical connection.
CREATE UNIQUE INDEX crossovers_connection_unique ON crossovers (
    LEAST(from_track_segment_id, to_track_segment_id),
    GREATEST(from_track_segment_id, to_track_segment_id),
    (CASE WHEN from_track_segment_id < to_track_segment_id THEN from_position ELSE to_position END),
    (CASE WHEN from_track_segment_id < to_track_segment_id THEN to_position ELSE from_position END)
);
CREATE INDEX ON crossovers (from_track_segment_id);
CREATE INDEX ON crossovers (to_track_segment_id);

ALTER TABLE scenario_covers
    DROP CONSTRAINT scenario_covers_pkey,
    ALTER COLUMN track_segment_id DROP NOT NULL,
    ADD COLUMN crossover_id INT REFERENCES crossovers(id) ON DELETE RESTRICT,
    ADD CONSTRAINT scenario_covers_one_element_check
        CHECK ((track_segment_id IS NOT NULL) <> (crossover_id IS NOT NULL));

CREATE UNIQUE INDEX scenario_covers_segment_unique
    ON scenario_covers (scenario_id, track_segment_id)
    WHERE track_segment_id IS NOT NULL;
CREATE UNIQUE INDEX scenario_covers_crossover_unique
    ON scenario_covers (scenario_id, crossover_id)
    WHERE crossover_id IS NOT NULL;
CREATE INDEX ON scenario_covers (crossover_id);

