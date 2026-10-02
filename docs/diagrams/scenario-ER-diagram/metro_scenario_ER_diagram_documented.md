# Scenario ER Model

This document contains the Mermaid ER diagram for the scenario data model.

The domain concepts themselves are documented in the [Scenario Entity Model](https://github.com/aau-cph-sw5/case-a-emergency-scenarios/blob/diagramStructuring/docs/diagrams/scenario-state-diagram/metro_scenario_entity_model_documented.md?plain=1).

This document only describes what is added by the relational representation: **primary keys, foreign keys, uniqueness constraints, and how the relationships are implemented in the database**.

---

## ER diagram

```mermaid
erDiagram
    scenarios {
        text scenario_id PK "stable id, survives renames"
        text name
    }
    scenario_versions {
        int id PK
        text scenario_id FK
        text version "unique per scenario"
        text revision
    }
    stations {
        int id PK
        text name
    }
    operating_plans {
        int id PK
        int scenario_version_id FK, UK "one plan per version"
        text name
    }
    operating_patterns {
        int id PK
        int operating_plan_id FK
        text operation_type "PENDULUM or ROUNDTRIP"
        text route_code
        text track
        int maximum_trains
        text did
        text description
    }
    line_stops {
        int id PK
        int operating_pattern_id FK
        int station_id FK
        int sequence "unique per pattern"
        text station_role "TERMINUS, TURNAROUND or STOP"
    }
    station_requirements {
        int id PK
        int scenario_version_id FK
        int station_id FK
        text placement "steward placement"
        int minimum_staffing
    }
    staffing_windows {
        int id PK
        int station_requirement_id FK
        text day_pattern
        time start_time
        time end_time
    }
    actions {
        int id PK
        int station_requirement_id FK
        int sequence "unique per requirement"
        text instruction
    }
    passenger_information {
        int id PK
        int scenario_version_id FK
        text channel "PA or PID"
        text language
        text message
    }

    scenarios ||--|{ scenario_versions : "versions"
    scenario_versions ||--|| operating_plans : "operating plan"
    operating_plans ||--|{ operating_patterns : "patterns"
    operating_patterns ||--|{ line_stops : "route"
    stations ||--o{ line_stops : "stopped at"
    scenario_versions ||--|{ station_requirements : "requires"
    stations ||--o{ station_requirements : "required at"
    station_requirements ||--o{ staffing_windows : "active during"
    station_requirements ||--o{ actions : "actions"
    scenario_versions ||--o{ passenger_information : "passenger info"
```

---
