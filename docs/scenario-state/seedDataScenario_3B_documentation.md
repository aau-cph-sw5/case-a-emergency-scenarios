# Scenario schema

This document describes the structure of a scenario 3B, based on the scenario schema for the M3 and M4 lines. A scenario is a prepared fallback plan for a disruption on a track. It covers how trains run, where staff must be and what to do and what passengers are told.


---

## Overview

```
Scenario
├─ scenarioId, name, currentVersion      required
├─ covers[]                              optional
└─ versions[]                            required
   ├─ version, revision                  required
   ├─ operatingPlan                      required
   │  ├─ name
   │  └─ patterns[]
   │     └─ route[]
   ├─ stationRequirements[]              required
   └─ passengerInformation[]             optional
```

A scenario has one or more versions. Each version is a snapshot of the plan, not a diff against the previous version. If a station requirement is unchanged between versions, it still appears in both.

---

## Scenario (top level)

| Field | Type | Required | Description |
|---|---|---|---|
| `scenarioId` | string | yes | Unique ID for the scenario |
| `name` | string | yes | readable name. |
| `currentVersion` | string | yes | The `version` of the entry in `versions` that is currently active. |
| `covers` | TrackSegment[] | no | The track segments the scenario closes. Each is `{ "trackNumber": 1, "stationA": "NEL", "stationB": "MOP" }`: the physical track, 1 or 2, and its two neighbouring stations. |
| `versions` | Version[] | yes | All versions of the scenario, oldest first. |

---

## Version

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | string | yes | Version number, unique within the scenario. |
| `revision` | string | yes | Short description of what changed in this version. |
| `operatingPlan` | OperatingPlan | yes | How trains run in this version. |
| `stationRequirements` | StationRequirement[] | yes | Staffing per station. Can be an empty array. |
| `passengerInformation` | PassengerInformation[] | no | Announcements and display texts. |

---

## OperatingPlan

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Name of the plan fx `"VAN_FB_begge_perroner_v1.1"`. |
| `patterns` | Pattern[] | yes | One entry per train pattern in the plan. |

### Pattern

| Field | Type | Required | Description |
|---|---|---|---|
| `operationType` | `"PENDULUM"` \| `"ROUNDTRIP"` | yes | `PENDULUM`: a train shuttles back and forth on a stretch. `ROUNDTRIP`: a train runs out and returns to its starting point. |
| `routeCode` | string | yes | Code for the route, fx `"VAN-FB"`. |
| `trackNumber` | integer | yes | The physical track the pattern runs on: 1 or 2, or 12 for a roundtrip that uses both tracks. |
| `maximumTrains` | integer ≥ 0 | yes | Maximum number of trains running in the pattern. |
| `did` | string | yes | DID identifier for the pattern. |
| `description` | string | no | Free-text description. |
| `route` | object[] | yes | The stops of the pattern, in order. See below. |

### Route stop

The schema only says that `route` items are objects. By convention, we use this shape:

| Field | Type | Description |
|---|---|---|
| `sequence` | integer | Position in the route, starting at 1. |
| `station` | string | Station code. |

```json
"route": [
  { "sequence": 1, "station": "NEL" },
  { "sequence": 2, "station": "MOP" },
  { "sequence": 3, "station": "SLU" }
]
```

---

## StationRequirement

| Field | Type | Required | Description |
|---|---|---|---|
| `station` | string | yes | Station code. |
| `placement` | string | yes | Where staff are placed, fx `"platform"`. |
| `minimumStaffing` | integer ≥ 0 | yes | Minimum number of staff. |
| `activeDuring` | TimeWindow[] | no | When the requirement applies. If omitted, it applies whenever the scenario is active. |
| `actions` | Action[] | no | Instructions for staff at the station. |

### Action

| Field | Type | Required | Description |
|---|---|---|---|
| `sequence` | integer | yes | Order of the action, starting at 1. |
| `instruction` | string | yes | What the staff member should do. Note: singular `instruction`. |

---

## PassengerInformation

| Field | Type | Required | Description |
|---|---|---|---|
| `channel` | `"PA"` \| `"PID"` | yes | `PA`: public address announcement. `PID`: passenger information display. |
| `language` | string | yes | Language code, lowercase: `"da"`, `"en"`. |
| `message` | string | yes | The text to announce or display. |

Add one entry per channel and language combination.

---

