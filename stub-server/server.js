import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./contract-validator.js";

const app = express();
const PORT = 4010;

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
          Activate a scenario. Body: { "actor": "operator-017" }.
          This endpoint cannot be opened directly as a browser link because it requires a POST request.
        </div>
      </div>

    </body>
    </html>
  `);
});

// ============================================
// ACTIVE SCENARIO
// ============================================

app.get("/api/v1/scenario-state", (req, res) => {
  const data = readJson(path.join(fixtures, "scenario-state.json"));

  sendValidated(req, res, data, ["scenario-state.schema.json"]);
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
// SCENARIO ACTIVATION
// ============================================

// In-memory, so activations reset when the stub restarts. Seeded with the
// fixture's activation so it agrees with GET /api/v1/scenario-state.
const activations = [readJson(path.join(fixtures, "scenario-state.json"))];

// Metro's answer on MET-A-007: several scenarios may be active on the same
// line, and activating never stands down another activation. Only activating
// the same scenario twice is refused.
app.post("/api/v1/scenarios/:scenarioId/activate", (req, res) => {
  const { scenarioId } = req.params;

  const errors = validate(req.body, ["activation-request.schema.json"]);

  if (errors.length > 0) {
    return res.status(400).json({
      code: "INVALID_REQUEST",
      message: errors.join("; "),
    });
  }

  const filePath = path.join(fixtures, "scenarios", `${scenarioId}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      code: "SCENARIO_NOT_FOUND",
      message: `No scenario with id '${scenarioId}' exists`,
    });
  }

  const alreadyActive = activations.some(
    (activation) =>
      activation.scenarioId === scenarioId && activation.status === "ACTIVE",
  );

  if (alreadyActive) {
    return res.status(409).json({
      code: "SCENARIO_ALREADY_ACTIVE",
      message: `Scenario '${scenarioId}' is already active`,
    });
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
    actor: req.body.actor,
    deployments: (currentVersion?.stationRequirements ?? []).map(
      (requirement) => ({
        status: "UNMANNED",
        staff: null,
        fulfills: requirement.station,
      }),
    ),
  };

  activations.push(activation);
  console.log("Scenario activated:", activation);

  res.status(201);
  sendValidated(req, res, activation, ["scenario-state.schema.json"]);
});

app.listen(PORT, () => {
  console.log(`Stub server running at http://localhost:${PORT}`);
});
