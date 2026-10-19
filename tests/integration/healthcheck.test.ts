import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { app } from "../../src/app.js";

test("GET /healthcheck responds 200 with ok: true", async (t) => {
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;

  const response = await fetch(`http://127.0.0.1:${port}/healthcheck`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
