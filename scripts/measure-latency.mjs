// Measures how fast activations reach stewards and position reports reach operators
// Run with default 25 clients: npm run measure
// Run with n clients: npm run measure -- n

import { io } from "socket.io-client";

// Measure-latency script settings.
// The Measure_Latency_URL_API comes from .env
// It can be swapped with staging API to measure latency on staging
const URL = process.env.MEASURE_LATENCY_API_URL ?? "http://localhost:3000";
const CLIENTS = Number(process.argv[2] ?? 25);
if (!Number.isInteger(CLIENTS) || CLIENTS < 1) {
  throw new Error(
    `The number of clients must be a whole number above 0, got "${process.argv[2]}"`,
  );
}
const SCENARIO = "DEMO-002";
const STATION = "Station C";
const TARGET_MS = 3000;
const TIMEOUT_MS = 10_000;

// Signs in over HTTP and returns the bearer token.
async function login(username, password, expectedRole) {
  const response = await fetch(`${URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, expectedRole }),
  });
  if (!response.ok)
    throw new Error(`Login as ${username} failed: ${response.status}`);
  return (await response.json()).token;
}

// Sends an authenticated POST to the API.
function post(path, token, body = {}) {
  return fetch(`${URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Opens one simulated client socket and resolves once it is connected.
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { auth: { token }, transports: ["websocket"] });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

// Resolves with the ms from t0 to each of the first `count` matching events.
function collect(socket, event, count, t0, matches = () => true) {
  return new Promise((resolve, reject) => {
    const times = [];
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(
        new Error(
          `Only ${times.length} of ${count} "${event}" within ${TIMEOUT_MS} ms`,
        ),
      );
    }, TIMEOUT_MS);
    function onEvent(payload) {
      if (!matches(payload)) return;
      times.push(performance.now() - t0);
      if (times.length === count) {
        clearTimeout(timer);
        socket.off(event, onEvent);
        resolve(times);
      }
    }
    socket.on(event, onEvent);
  });
}

// The value that a share p of the samples is at or under, e.g. 0.95 for p95.
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * p) - 1];
}

// Prints the sample size, median, p95, max and whether p95 meets the target.
function report(title, samples, how) {
  const p95 = percentile(samples, 0.95);
  const ms = (value) => `${Math.round(value)} ms`;
  console.log(`\n${title}  n = ${samples.length} (${how})`);
  console.log(
    `  median ${ms(percentile(samples, 0.5))}   p95 ${ms(p95)}   max ${ms(Math.max(...samples))}` +
      `   target p95 < ${TARGET_MS} ms: ${p95 < TARGET_MS ? "PASS" : "FAIL"}`,
  );
}

async function main() {
  // Wake staging before measuring since render sleeps when inactive
  await fetch(`${URL}/healthcheck`);
  // One token per role, shared by all simulated clients of that role.
  const operatorToken = await login("operator", "operator123", "OPERATOR");
  const stewardToken = await login("steward", "steward123", "STEWARD");

  // Connect the simulated steward clients and one operator client.
  const stewards = await Promise.all(
    Array.from({ length: CLIENTS }, () => connect(stewardToken)),
  );
  const operator = await connect(operatorToken);

  try {
    // Activation to every connected steward
    let t0 = performance.now();
    const activations = stewards.map((steward) =>
      collect(
        steward,
        "scenario-activated",
        1,
        t0,
        (e) => e.scenario?.scenarioId === SCENARIO,
      ),
    );
    const response = await post(
      `/api/v1/scenarios/${SCENARIO}/activate`,
      operatorToken,
    );
    if (response.status === 409) {
      throw new Error(`${SCENARIO} is already active`);
    }
    report(
      "Activation → steward",
      (await Promise.all(activations)).flat(),
      `1 activation × ${CLIENTS} clients`,
    );

    // Position reports from stewards to operator (all stewards report at once)
    t0 = performance.now();
    const reports = collect(operator, "position-report", CLIENTS, t0);
    const body = {
      staff: "",
      station: STATION,
      reportedAt: new Date().toISOString(),
    };
    await Promise.all(
      stewards.map(() => post("/api/v1/position-reports", stewardToken, body)),
    );
    report(
      "Position report → operator",
      await reports,
      `${CLIENTS} simultaneous reports`,
    );

    console.log(`\nURL ${URL}, run ${new Date().toISOString()}`);
  } finally {
    // Close every socket that was opened
    [...stewards, operator].forEach((socket) => socket.disconnect());
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
