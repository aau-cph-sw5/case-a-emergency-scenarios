# ADR 0012. Model the metro network separately from operating patterns

**Status.** Proposed
**Date.** 2026-11-12
**Revised.** 2026-11-12: clarify coverage and crossover behavior.

## Context

The admin scenario editor needs to select a line group and stations, draw the
covered track and create pendulum or roundtrip operating patterns. The shared
map currently gets station positions, line connections and crossovers from
`mockData/data.tsx`.

The database stores stations, track segments and scenario patterns, but it does
not contain a complete normal M1–M4 network. `scenario_covers` associates a
scenario with unavailable infrastructure. `line_stops` orders stations within a scenario
pattern; it does not define the normal lines or identify the exact track path.
The same station can be used by several lines and patterns, and a train can
pass a station without stopping. Shared routes, branches and the M3 loop make
it unsafe to assume that two stops always identify one physical path.

The proposed V016 migration removes the one-per-version `operating_plans`
table and links patterns directly to scenario versions. It requires existing
plans and patterns to be cleared before it runs; scenario data will be loaded
separately. It does not complete the network or correct scenario data.

## Decision

Model the physical network independently of the services that use it:

- Keep `stations` as shared station identities, and use `track_segments` for
  physical connections between adjacent stations on a track. Populate the
  complete network independently of scenarios. Multiple lines and patterns may
  use the same physical segment.
- Store crossovers separately from track segments: crossovers connect tracks
  and identify their location and connected tracks. Give each independently
  unavailable physical connection its own crossover record and ID. A connection
  may be traversed in either direction, and covering one does not automatically
  make another unavailable. The diagram's
  visual crossover types do not currently require separate types in the data
  model. Keep one `scenario_covers` table for both kinds of
  infrastructure, with a nullable foreign key to each and a constraint
  requiring exactly one per row. Enforce uniqueness for each scenario and
  covered element. A covered element is unavailable due to the incident.
  Coverage is currently shared by all versions of a scenario; whether it
  should be versioned remains open.
- Allow operating patterns to describe normal service independently of a
  scenario, as well as service belonging to a particular scenario version.
  Normal operation includes patterns for M1–M4 and is not represented as an
  incident scenario. Identify each normal line explicitly. A dedicated `lines`
  table is not required by this decision; decide whether one is useful for line
  names, colours and multiple normal patterns when the schema is designed.
- Keep `line_stops` for the ordered stations at which a pattern stops. A
  pattern's physical path and its stops are distinct: passing a station does
  not necessarily mean stopping there.
- Do not store exact pattern paths for now. The editor can use the network to
  calculate or draw routes between stops. If several paths are possible, it
  must not silently assume which one is intended. Persisting an exact path and
  validating track and crossover use can be added when required.
- Store schematic map positions separately from the connectivity they
  illustrate. Track segments are drawn as straight lines for now. The current hard-coded geometry can remain in
  use until the database network and map data are complete and validated.

These are design directions, not claims that the new tables or data already
exist. Exact names and constraints are implementation decisions.

## Consequences

Normal service is available without inventing a scenario, while scenario
versions can describe their own patterns. The same track segment can be used
by more than one line, pattern or scenario. The editor can eventually use the shared network to draw paths rather than
interpreting a scenario stop list as the whole network.

The network, normal routes, schematic geometry and crossover information must
be populated and checked against authoritative sources. The project has station
position data to add when the tables are ready. Current track segments cover
only part of the network. Existing scenario data also needs independent
review: the inspected VAN-FB version 1.1 lacks its VAN-FB pattern, and its
FB–VEA and FB–CPH stop lists omit KGN. Confirm the intended stops before
correcting them in scenario source data. Schema migrations should change
schema; scenario data corrections belong in the scenario data workflow.

Pattern stops do not specify an exact track-by-track path. The application
cannot always determine which patterns use unavailable infrastructure without
additional path selection or stored paths. It must distinguish physical
connections, scheduled stops and map presentation. The project is not
in production, so existing data can be reset during this redesign. Future changes, such as adding stations, may be managed through an
administrative editor. Whether historical scenarios need a network snapshot or
other versioning remains open; an editor alone would not preserve old layouts.

## Alternatives considered

**Use only scenario stop lists to draw the network.** Rejected: they describe
scenario services, not complete normal infrastructure, and consecutive stops
may not be physically adjacent.

**Store every pattern path now.** Deferred: it would require track-by-track
route data for each pattern. Inference alone can be ambiguous around branches,
loops or crossovers, so the editor must not silently guess a path. Persisted
paths can be introduced if the application needs to retain an exact choice.

**Hard-code the entire network in the map.** Retained temporarily for map
presentation, but not as the long-term source for network and route data shared
by the editor and scenarios.

**Combine tracks and crossovers in one `track_segments` table.** Not chosen:
these elements need different fields and constraints. Separate tables keep
those distinctions explicit while `scenario_covers` can still reference both.

**Use a common `network_elements` parent for all coverable infrastructure.**
Not chosen for now: with only track segments and crossovers, two constrained
foreign keys in `scenario_covers` are simpler. Revisit if more infrastructure
types become coverable.

**Adopt a full railway data standard as the application schema.** Not chosen
at this stage. GTFS separates routes, trips, stops and shapes; railML models
railway topology and geometry. These are useful references, but adopting either
whole model requires separate assessment of project needs and data sources.
