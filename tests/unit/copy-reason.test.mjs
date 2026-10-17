import test from "node:test";
import assert from "node:assert/strict";
import { FormatError, HttpError } from "../../shared/api/http.ts";
import { reasonFor } from "../../shared/offline/copy-reason.ts";

test("a 401 means the session expired", () => {
  assert.equal(
    reasonFor(new HttpError("GET /api/v1/scenario-state", 401)),
    "expired",
  );
});

test("another status or a malformed answer is a server error", () => {
  assert.equal(
    reasonFor(new HttpError("GET /api/v1/scenario-state", 500)),
    "server",
  );
  assert.equal(reasonFor(new FormatError("/api/v1/scenario-state")), "server");
});

test("no answer at all counts as offline", () => {
  assert.equal(reasonFor(new TypeError("Network request failed")), "offline");
  // React Native's timeout error is not always an Error instance.
  assert.equal(reasonFor({ name: "TimeoutError" }), "offline");
});
