import test from "node:test";
import assert from "node:assert/strict";
import { FormatError, HttpError } from "../../shared/api/http.ts";
import { reasonFor } from "../../shared/offline/copy-reason.ts";

test("an error answer or a malformed answer is a server error", () => {
  assert.equal(reasonFor(new HttpError("GET /x", 500)), "server");
  assert.equal(reasonFor(new HttpError("GET /x", 401)), "server");
  assert.equal(reasonFor(new FormatError("/x")), "server");
});

test("no answer counts as offline, also when it is not an Error", () => {
  assert.equal(reasonFor(new TypeError("Network request failed")), "offline");
  assert.equal(
    reasonFor(new DOMException("timed out", "TimeoutError")),
    "offline",
  );
  assert.equal(reasonFor("Network request failed"), "offline");
});
