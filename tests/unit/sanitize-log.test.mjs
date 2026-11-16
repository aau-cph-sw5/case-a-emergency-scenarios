import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeLogValue } from "../../web/src/sanitize-log.ts";

test("sanitizeLogValue neutralizes line breaks and control characters", () => {
  assert.equal(
    sanitizeLogValue("request failed\r\nforged\u2028entry\u001b"),
    "request failed  forged entry ",
  );
});

test("sanitizeLogValue sanitizes Error stacks", () => {
  const error = new Error("request failed\r\nforged entry");

  assert.doesNotMatch(sanitizeLogValue(error), /[\r\n\u2028\u2029]/);
  assert.match(sanitizeLogValue(error), /request failed {2}forged entry/);
});

test("sanitizeLogValue does not stringify arbitrary rejected objects", () => {
  const error = {
    toString() {
      throw new Error("must not be called");
    },
  };

  assert.equal(sanitizeLogValue(error), "Unknown error");
});
