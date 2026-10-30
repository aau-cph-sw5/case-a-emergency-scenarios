import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./contract-validator.js";
import { login, requireAuth } from "./auth.js";
import { ERROR_CODES, errorBody } from "../shared/error-codes.ts";
import { classifyStatusChange } from "../shared/scenario/steward-status.ts";

const app = express();
const PORT = process.env.PORT || 4010;

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtures = path.join(__dirname, "../fixtures/v1");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Sends the body only if it matches the contract; otherwise responds 500
// so a broken fixture is noticed instead of silently served to clients.
function sendValidated(req, res, data, schemaIds) {
  const errors = validate(data, schemaIds);

  if (errors.length > 0) {
    console.error(
      `Response for ${req.method} ${req.path} violates contract:`,
      errors,
    );

    return res.status(500).json({
      error: "Response does not match contract schema",
      details: errors,
    });
  }

  res.json(data);
}

// ============================================
// STUB SERVER HOME PAGE
// ============================================

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>Emergency Scenario API</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 900px;
          margin: 60px auto;
          padding: 0 20px;
          background: #f5f5f5;
          color: #222;
        }

        h1 {
          margin-bottom: 5px;
        }

        .subtitle {
          color: #666;
          margin-bottom: 35px;
        }

        .endpoint {
          background: white;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .method {
          font-weight: bold;
          margin-right: 10px;
        }

        a {
          font-family: monospace;
          font-size: 16px;
        }

        .description {
          margin-top: 8px;
          color: #666;
        }

        .post {
          font-family: monospace;
        }
      </style>
    </head>

    <body>

      <h1>Emergency Scenario API</h1>


      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/scenario-state">
          /api/v1/scenario-state
        </a>

        <div class="description">
          Get the currently active scenario and live staffing state.
        </div>
      </div>


      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/scenarios">
          /api/v1/scenarios
        </a>

        <div class="description">
          Get the list of available scenarios.
        </div>
      </div>


      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/scenarios/DEMO-001">
          /api/v1/scenarios/DEMO-001
        </a>

        <div class="description">
          Get a specific scenario definition.
        </div>
      </div>

      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/scenarios/DEMO-002">
          /api/v1/scenarios/DEMO-002
        </a>

        <div class="description">
          Get a specific scenario definition.
        </div>
      </div>

      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/scenarios/DEMO-003">
          /api/v1/scenarios/DEMO-003
        </a>

        <div class="description">
          Get a specific scenario definition.
        </div>
      </div>


      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/metro-lines/M1">
          /api/v1/metro-lines/M1
        </a>

        <div class="description">
          Get the M1 metro line and its ordered stations.
        </div>
      </div>

      <div class="endpoint">
        <span class="method">GET</span>
        <a href="/api/v1/metro-lines/M2">
          /api/v1/metro-lines/M2
        </a>

        <div class="description">
          Get the M2 metro line and its ordered stations.
        </div>
      </div>


      <div class="endpoint">
        <span class="method">POST</span>

        <span class="post">
          /api/v1/position-reports
        </span>

        <div class="description">
          Submit a steward position report.
          This endpoint cannot be opened directly as a browser link because it requires a POST request.
        </div>
      </div>

      <div class="endpoint">
        <span class="method">POST</span>

        <span class="post">
          /api/v1/scenarios/{scenarioId}/activate
        </span>

        <div class="description">
          Activate a scenario. Requires a bearer token with the OPERATOR role.
          This endpoint cannot be opened directly as a browser link because it requires a POST request.
        </div>
      </div>

      <div class="endpoint">
        <span class="method">GET / PUT</span>

        <span class="post">
          /api/v1/steward-status
        </span>

        <div class="description">
          Read or set the signed-in steward's status and station (assign, check in, check out).
          Requires a bearer token with the STEWARD role and an active scenario.
        </div>
      </div>

      <div class="endpoint">
        <span class="method">GET</span>

        <span class="post">
          /api/v1/steward-statuses
        </span>

        <div class="description">
          The status of every steward in the active scenario.
          Requires a bearer token with the OPERATOR role.
        </div>
      </div>

    </body>
    </html>
  `);
});

// ============================================
// ACTIVE SCENARIO
// ============================================

// Like the server: the active activation, or null while none is active.
app.get("/api/v1/scenario-state", (req, res) => {
  const active = activations.find((a) => a.status === "ACTIVE");
  if (active === undefined) return res.json(null);

  sendValidated(req, res, active, ["scenario-state.schema.json"]);
});

// ============================================
// SCENARIO LIST
// ============================================

app.get("/api/v1/scenarios", (req, res) => {
  const data = readJson(path.join(fixtures, "scenarios.json"));

  sendValidated(req, res, data, [
    "scenario-list.schema.json",
    "openapi-scenarios-response",
  ]);
});

// ============================================
// SPECIFIC SCENARIO
// ============================================

app.get("/api/v1/scenarios/:scenarioId", (req, res) => {
  const { scenarioId } = req.params;

  const filePath = path.join(fixtures, "scenarios", `${scenarioId}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Scenario not found",
    });
  }

  sendValidated(req, res, readJson(filePath), ["scenario.schema.json"]);
});

// ============================================
// METRO LINE
// ============================================

app.get("/api/v1/metro-lines/:lineId", (req, res) => {
  const { lineId } = req.params;

  const filePath = path.join(fixtures, "metro-lines", `${lineId}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Metro line not found",
    });
  }

  sendValidated(req, res, readJson(filePath), ["metro-line.schema.json"]);
});

// ============================================
// POSITION REPORT
// ============================================

app.post("/api/v1/position-reports", (req, res) => {
  const errors = validate(req.body, ["position-report.schema.json"]);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Request body does not match contract schema",
      details: errors,
    });
  }

  console.log("Position report received:", req.body);

  res.status(202).json({
    accepted: true,
  });
});

// ============================================
// LOGIN ROUTE
// ============================================

app.post("/api/v1/auth/login", (req, res) => {
  const errors = validate(req.body, ["login-request.schema.json"]);
  if (errors.length > 0) {
    return res
      .status(400)
      .json(
        errorBody(
          ERROR_CODES.MISSING_PARAMETER,
          "Request body does not match contract schema",
        ),
      );
  }

  const result = login(req.body.username, req.body.password, req.body.client);
  if (!result) {
    return res
      .status(401)
      .json(errorBody(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials"));
  }

  sendValidated(req, res, result, ["login-response.schema.json"]);
});

app.get("/api/v1/me", requireAuth, (req, res) => {
  sendValidated(req, res, req.user, ["me.schema.json"]);
});

// ============================================
// SCENARIO ACTIVATION
// ============================================

// In-memory, so activations reset when the stub restarts. Starts empty: no
// scenario is active until one is activated. GET /api/v1/scenario-state
// answers from these activations.
const activations = [];

// Only one scenario can be active at a time, so any activation is refused
// while another is active.
// Metro on MET-A-026: "All in CCR can activate a scenario". The full role
// matrix is #25's; this only keeps stewards out.
app.post("/api/v1/scenarios/:scenarioId/activate", requireAuth, (req, res) => {
  const { scenarioId } = req.params;

  if (req.user.role !== "OPERATOR") {
    return res
      .status(403)
      .json(
        errorBody(
          ERROR_CODES.ROLE_NOT_PERMITTED,
          `Role ${req.user.role} may not activate a scenario`,
        ),
      );
  }

  const filePath = path.join(fixtures, "scenarios", `${scenarioId}.json`);

  if (!fs.existsSync(filePath)) {
    return res
      .status(404)
      .json(
        errorBody(
          ERROR_CODES.NOT_FOUND,
          `No scenario with id '${scenarioId}' exists`,
        ),
      );
  }

  const alreadyActive = activations.some(
    (activation) => activation.status === "ACTIVE",
  );

  if (alreadyActive) {
    return res
      .status(409)
      .json(
        errorBody(
          ERROR_CODES.CONFLICT,
          `A scenario is already active, so '${scenarioId}' cannot be activated`,
        ),
      );
  }

  const scenario = readJson(filePath);
  const currentVersion = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );

  const activation = {
    activationId: `ACT-${scenarioId}-${activations.length + 1}`,
    scenarioId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "ACTIVE",
    actor: req.user.userId,
    sequence: activations.length + 1,
    deployments: (currentVersion?.stationRequirements ?? []).map(
      (requirement) => ({
        status: "UNMANNED",
        staff: null,
        fulfills: requirement.station,
      }),
    ),
  };

  // Store only a response that passes validation; otherwise a 500 would leave
  // the activation behind and a retry would answer 409.
  const schemaIds = ["scenario-state.schema.json"];

  if (validate(activation, schemaIds).length === 0) {
    activations.push(activation);
    console.log("Scenario activated:", activation);
  }

  res.status(201);
  sendValidated(req, res, activation, schemaIds);
});

// ============================================
// STEWARD STATUS (MET-A-015)
// ============================================

// In-memory and keyed by activation, so a new activation starts with no
// statuses and every steward has to assign again.
const stewardStatuses = new Map();

const statusKey = (activationId, userId) => `${activationId}:${userId}`;

// The stub's test accounts have text userIds, but the contract's userId is an
// integer, as in GET /api/v1/me. Each account gets its position in
// test-accounts.json, starting at 1.
function numericUserId(userId) {
  if (Number.isInteger(userId)) return userId;
  const accounts = readJson(path.join(fixtures, "test-accounts.json"));
  return accounts.findIndex((account) => account.userId === userId) + 1;
}

// Shared by the three routes: the role check and the active scenario.
function activeScenarioFor(req, res, role) {
  if (req.user.role !== role) {
    res
      .status(403)
      .json(
        errorBody(
          ERROR_CODES.ROLE_NOT_PERMITTED,
          `Role ${req.user.role} may not use this endpoint`,
        ),
      );
    return null;
  }

  const active = activations.find((a) => a.status === "ACTIVE");
  if (active === undefined) {
    res.status(409).json(errorBody(ERROR_CODES.NO_ACTIVE_SCENARIO));
    return null;
  }

  return active;
}

app.get("/api/v1/steward-status", requireAuth, (req, res) => {
  const active = activeScenarioFor(req, res, "STEWARD");
  if (active === null) return;

  const key = statusKey(active.activationId, numericUserId(req.user.userId));
  const status = stewardStatuses.get(key);
  if (status === undefined) return res.json(null);

  sendValidated(req, res, status, ["steward-status.schema.json"]);
});

app.put("/api/v1/steward-status", requireAuth, (req, res) => {
  const errors = validate(req.body, ["steward-status-request.schema.json"]);
  if (errors.length > 0) {
    return res
      .status(400)
      .json(
        errorBody(
          ERROR_CODES.MISSING_PARAMETER,
          "Request body does not match contract schema",
        ),
      );
  }

  const active = activeScenarioFor(req, res, "STEWARD");
  if (active === null) return;

  const { status, station } = req.body;
  const stations = active.deployments.map((d) => d.fulfills);
  if (!stations.includes(station)) {
    return res.status(409).json(errorBody(ERROR_CODES.STATION_NOT_IN_SCENARIO));
  }

  const userId = numericUserId(req.user.userId);
  const key = statusKey(active.activationId, userId);
  const current = stewardStatuses.get(key) ?? null;

  switch (classifyStatusChange(current, { status, station })) {
    case "REPEAT":
      return sendValidated(req, res, current, ["steward-status.schema.json"]);
    case "INVALID":
      return res
        .status(409)
        .json(
          errorBody(
            ERROR_CODES.INVALID_STATUS_TRANSITION,
            current === null
              ? "Assign yourself to a station first"
              : `Cannot change from ${current.status} at ${current.station} to ${status} at ${station}`,
          ),
        );
  }

  const next = {
    userId,
    activationId: active.activationId,
    station,
    status,
    changedAt: new Date().toISOString(),
  };
  stewardStatuses.set(key, next);
  console.log("Steward status changed:", next);

  sendValidated(req, res, next, ["steward-status.schema.json"]);
});

app.get("/api/v1/steward-statuses", requireAuth, (req, res) => {
  const active = activeScenarioFor(req, res, "OPERATOR");
  if (active === null) return;

  const statuses = [...stewardStatuses.values()].filter(
    (status) => status.activationId === active.activationId,
  );

  sendValidated(req, res, statuses, ["steward-status-list.schema.json"]);
});

app.listen(PORT, () => {
  console.log(`Stub server running at http://localhost:${PORT}`);
});
