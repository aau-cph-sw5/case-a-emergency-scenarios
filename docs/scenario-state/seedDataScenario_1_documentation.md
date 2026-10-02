# Scenario schema

This document describes the structure of a scenario, based on the scenario schema. A scenario is a prepared fallback plan for a disruption on a track. It covers how trains run, where staff must be and what to do and what passengers are told


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
   │  ├─ activeDuring[]                  optional
   │  └─ actions[]                       optional
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
| `covers` | string[] | no | Station codes affected by the scenario. |
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
| `track` | string | yes | Track the pattern uses. |
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
  { "sequence": 1, "station": "VAN" },
  { "sequence": 2, "station": "FLI" },
  { "sequence": 3, "station": "FB" }
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

### TimeWindow

| Field | Type | Required | Description |
|---|---|---|---|
| `dayPattern` | string | yes | Days the window applies, e.g. `"MON-FRI"`, `"MON-THU"`, `"FRI"`, `"DAILY"`. |
| `startTime` | string | yes | `HH:MM` or `HH:MM:SS`, 24-hour clock. |
| `endTime` | string | yes | Same format as `startTime`. |

A station can have several windows, e.g. separate morning and afternoon peaks.

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

