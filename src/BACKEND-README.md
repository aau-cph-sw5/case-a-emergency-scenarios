# API server

This folder is the TypeScript Express server: the API and Socket.IO.

## Layers

A request passes through the layers top to bottom. Each layer only calls the
one below it.

```text
routes/         which URL and method, and which middleware runs first
middleware/     checks that run before the handler
controllers/    reads the request, picks the status code and sends the response
services/       logic that isn't about HTTP, e.g. checking a password
repositories/   where the data comes from: the fixture files, or the
                database through src/db/client.ts.
```

For example, `GET /api/v1/scenarios/DEMO-001`:

```text
routes/scenario-routes.ts           matches the URL
middleware/require-auth.ts          rejects the request without a valid token
controllers/scenario-controller.ts  getScenario: 200 with the scenario, or 404
repositories/fixture-repository.ts  findScenario: reads fixtures/v1/scenarios/DEMO-001.json
```

### Middleware

- **`require-auth.ts`**: `requireAuth` reads `Authorization: Bearer <token>`
  and verifies the token with the auth service. Without a valid token it
  answers 401 (`E0001`) and the controller never runs. With one, it stores
  the user in `response.locals.user` for the next handler.
- **`validate-body.ts`**: `validateBody(schemaId)` checks the request body
  against a schema in `contracts/v1`, e.g.
  `validateBody("position-report.schema.json")`. An invalid body gets 400
  (`E0006`) with a list of the problems.

Put `requireAuth` before `validateBody`, so an unauthenticated request is
rejected before its body is examined.

### Services

- **`auth-service.ts`**: `login()` checks a username and password against
  the test accounts and returns a signed JWT with the user's id and role.
  `verifyToken()` checks a token's signature and expiry and returns the user,
  or `null`. The role always comes from the verified token, never from
  anything else the client sends.
- **`incident-log-service.ts`**: `appendEvent()` is the only way to write to
  the incident log. It takes the caller's transaction, so the change and its
  event commit together, and takes the actor from the verified user. See
  [the incident log reference](../docs/reference/incident-log.md).

### Repositories

- **`incident-event-repository.ts`**: the SQL for the `incident_events` table.
  Only `incident-log-service.ts` imports it.
- **`fixture-repository.ts`**: reads the JSON files in `fixtures/v1/`.

`getDatabase()` in `src/db/client.ts` returns column names in camelCase
(`server_time` becomes `serverTime`). JSON values are returned unchanged.

### Validation

- **`contract-validator.ts`**: loads every `*.schema.json` file in
  `contracts/v1` and registers it under its `$id`, e.g.
  `"login-request.schema.json"`. `validate(data, schemaId)` checks data
  against that schema and returns one message per problem, or an empty list
  when the data is valid. An unknown `schemaId` throws, so a typo can't pass
  silently.

  It is used in two places: `validateBody` checks request bodies with it, and
  the integration tests check response bodies with it. A new schema in
  `contracts/v1` is picked up automatically.

## Error codes

`error-codes.ts` holds the error codes the API sends, following the
[semester error-code scheme](https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/06-error-codes.md).
Every error response has the contract's shape:

```json
{ "error": { "code": "E0001", "message": "Invalid or expired token" } }
```
Codes that have been added:
| Code | Name | Sent when |
| --- | --- | --- |
| `E0001` | `AUTH_TOKEN_INVALID` | The bearer token is missing, invalid or expired (401) |
| `E0102` | `INVALID_CREDENTIALS` | The username or password is wrong at login (401) |
| `E0006` | `MISSING_PARAMETER` | A request body doesn't match its contract schema (400) |

Build error responses with `errorBody()` and the `ERROR_CODES` constants
instead of typing codes as strings:

```ts
response
  .status(401)
  .json(errorBody(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials"));
```

## Socket.IO

Socket.IO keeps a connection open between the server and each client, so the
server can push messages at any time instead of waiting for a request. It is
meant for real-time updates such as scenario activations and steward
positions.

It is set up in `server.ts` and attached to the same HTTP server as Express,
so the API and Socket.IO share one port (3000 locally).

```text
client connects          → server logs "Socket connected: <id>"
                         → server sends a "welcome" message to that client
client disconnects       → server logs "Socket disconnected: <id> <reason>"
```
