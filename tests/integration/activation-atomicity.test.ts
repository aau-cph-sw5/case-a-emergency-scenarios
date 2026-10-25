import test, { after } from "node:test";
import assert from "node:assert/strict";
import { getDatabase } from "../../src/db/client.js";
import { listActivations } from "../../src/repositories/fixture-repository.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import { activateAndLog } from "../../src/services/activation-service.js";

after(() => getDatabase().end());

const operator: AuthUser = {
  userId: 1,
  role: "OPERATOR",
  jti: "test-only-jti",
};

test("an activation whose event cannot be written is taken back", async () => {
  await assert.rejects(
    activateAndLog(operator, "DEMO-002", "operator", () =>
      Promise.reject(new Error("event write failed")),
    ),
    /event write failed/,
  );
  assert.deepEqual(listActivations("ACTIVE"), []);
});
