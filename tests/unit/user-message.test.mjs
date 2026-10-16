import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, userMessage } from "../../web/src/get-json.ts";

const url = "/api/v1/scenarios/X/activate";

test("an expired token asks the user to log in again", () => {
  const error = new ApiError(`POST ${url} failed with 401`, 401, "E0001");
  assert.match(userMessage(error), /Log ind igen/);
});

test("falls back on the status when the code is unknown", () => {
  assert.match(userMessage(new ApiError("x", 404, "E9999")), /findes ikke/);
  assert.match(userMessage(new ApiError("x", 409)), /allerede aktivt/);
  assert.match(userMessage(new ApiError("x", 503)), /Serveren/);
  assert.match(userMessage(new ApiError("x", 400)), /ikke gennemføres/);
});

test("a network or timeout error reads as no connection", () => {
  assert.match(userMessage(new TypeError("fetch failed")), /Ingen forbindelse/);
});

test("the developer message never reaches the user", () => {
  const error = new ApiError(`POST ${url} failed with 500`, 500);
  assert.doesNotMatch(userMessage(error), /api|POST|\//);
});
