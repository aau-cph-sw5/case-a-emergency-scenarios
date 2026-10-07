import { useState } from "react";
import { api } from "./api";

type HealthState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "error"; message: string }
  | { status: "done"; ok: boolean };

export function App() {
  const [state, setState] = useState<HealthState>({ status: "idle" });

  async function checkHealth() {
    setState({ status: "checking" });
    try {
      const health = await api.fetchHealth();
      setState({ status: "done", ok: health.ok });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <main>
      <h1>Emergency Scenarios</h1>

      <button
        type="button"
        onClick={checkHealth}
        disabled={state.status === "checking"}
      >
        {state.status === "checking" ? "Checking…" : "Check server health"}
      </button>

      {state.status === "done" && (
        <p role="status">
          {state.ok ? "Server is healthy" : "Server reports a problem"}
        </p>
      )}

      {state.status === "error" && (
        <p role="alert">
          Could not reach the server: {state.message}. Is it running (
          <code>npm run dev</code>)?
        </p>
      )}
    </main>
  );
}
