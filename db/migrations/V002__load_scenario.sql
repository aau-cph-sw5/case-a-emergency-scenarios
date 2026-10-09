CREATE OR REPLACE FUNCTION get_station_id(p_code TEXT) RETURNS INT
LANGUAGE sql AS $$
    INSERT INTO stations (code) VALUES (p_code)
    ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
    RETURNING id;
$$;

CREATE OR REPLACE FUNCTION get_track_segment_id(p_track INT, p_station_a TEXT, p_station_b TEXT)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_a_id INT := get_station_id(p_station_a);
    v_b_id INT := get_station_id(p_station_b);
    v_segment_id INT;
BEGIN
    SELECT id INTO v_segment_id
    FROM track_segments
    WHERE track_number = p_track
      AND LEAST(station_a_id, station_b_id)    = LEAST(v_a_id, v_b_id)
      AND GREATEST(station_a_id, station_b_id) = GREATEST(v_a_id, v_b_id);

    IF v_segment_id IS NULL THEN
        INSERT INTO track_segments (track_number, station_a_id, station_b_id)
        VALUES (p_track, v_a_id, v_b_id)
        RETURNING id INTO v_segment_id;
    END IF;

    RETURN v_segment_id;
END;
$$;

CREATE OR REPLACE FUNCTION load_scenario(doc JSONB) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_scenario_id TEXT := doc->>'scenarioId';

    v_cover   JSONB;
    v_version JSONB;
    v_pattern JSONB;
    v_stop    JSONB;
    v_req     JSONB;
    v_window  JSONB;
    v_action  JSONB;
    v_info    JSONB;

    v_version_id INT;
    v_plan_id    INT;
    v_pattern_id INT;
    v_req_id     INT;
    v_current_id INT;
BEGIN

    DELETE FROM scenarios WHERE scenario_id = v_scenario_id;

    INSERT INTO scenarios (scenario_id, name)
    VALUES (v_scenario_id, doc->>'name');

    FOR v_cover IN SELECT * FROM jsonb_array_elements(doc->'covers') LOOP
        INSERT INTO scenario_covers (scenario_id, track_segment_id)
        VALUES (
            v_scenario_id,
            get_track_segment_id(
                (v_cover->>'trackNumber')::INT,
                v_cover->>'stationA',
                v_cover->>'stationB'
            )
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    FOR v_version IN SELECT * FROM jsonb_array_elements(doc->'versions') LOOP
        INSERT INTO scenario_versions (scenario_id, version, revision)
        VALUES (v_scenario_id, v_version->>'version', v_version->>'revision')
        RETURNING id INTO v_version_id;

        INSERT INTO operating_plans (scenario_version_id, name)
        VALUES (v_version_id, v_version->'operatingPlan'->>'name')
        RETURNING id INTO v_plan_id;

        FOR v_pattern IN SELECT * FROM jsonb_array_elements(v_version->'operatingPlan'->'patterns') LOOP
            INSERT INTO operating_patterns
                (operating_plan_id, operation_type, route_code, track_number,
                 maximum_trains, did, description)
            VALUES (
                v_plan_id,
                v_pattern->>'operationType',
                v_pattern->>'routeCode',
                (v_pattern->>'trackNumber')::INT,
                (v_pattern->>'maximumTrains')::INT,
                v_pattern->>'did',
                v_pattern->>'description'   
            )
            RETURNING id INTO v_pattern_id;

            FOR v_stop IN SELECT * FROM jsonb_array_elements(v_pattern->'route') LOOP
                INSERT INTO line_stops (operating_pattern_id, station_id, sequence)
                VALUES (
                    v_pattern_id,
                    get_station_id(v_stop->>'station'),
                    (v_stop->>'sequence')::INT
                );
            END LOOP;
        END LOOP;

        FOR v_req IN SELECT * FROM jsonb_array_elements(COALESCE(v_version->'stationRequirements', '[]'::JSONB)) LOOP
            INSERT INTO station_requirements
                (scenario_version_id, station_id, placement, minimum_staffing)
            VALUES (
                v_version_id,
                get_station_id(v_req->>'station'),
                v_req->>'placement',
                (v_req->>'minimumStaffing')::INT
            )
            RETURNING id INTO v_req_id;

            FOR v_window IN SELECT * FROM jsonb_array_elements(COALESCE(v_req->'activeDuring', '[]'::JSONB)) LOOP
                INSERT INTO staffing_windows (station_requirement_id, day_pattern, start_time, end_time)
                VALUES (
                    v_req_id,
                    v_window->>'dayPattern',
                    (v_window->>'startTime')::TIME,
                    (v_window->>'endTime')::TIME
                );
            END LOOP;

            FOR v_action IN SELECT * FROM jsonb_array_elements(COALESCE(v_req->'actions', '[]'::JSONB)) LOOP
                INSERT INTO actions (station_requirement_id, sequence, instruction)
                VALUES (v_req_id, (v_action->>'sequence')::INT, v_action->>'instruction');
            END LOOP;
        END LOOP;

        FOR v_info IN SELECT * FROM jsonb_array_elements(COALESCE(v_version->'passengerInformation', '[]'::JSONB)) LOOP
            INSERT INTO passenger_information (scenario_version_id, channel, language, message)
            VALUES (v_version_id, v_info->>'channel', v_info->>'language', v_info->>'message');
        END LOOP;
    END LOOP;

    SELECT id INTO v_current_id
    FROM scenario_versions
    WHERE scenario_id = v_scenario_id
      AND version = doc->>'currentVersion';

    IF v_current_id IS NULL THEN
        RAISE EXCEPTION 'Scenario %: currentVersion "%" does not exist in versions',
            v_scenario_id, doc->>'currentVersion';
    END IF;

    UPDATE scenarios SET current_version_id = v_current_id
    WHERE scenario_id = v_scenario_id;
END;
$$;