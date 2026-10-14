import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { requireAuth } from "../../stub-server/auth.js";

const SECRET = process.env.JWT_SECRET || "local-dev-secret-not-for-production";

function mockReqRes(token) {
  const req = { headers: { authorization: token ? `Bearer ${token}` : "" } };
  let statusCode,
    body,
    nextCalled = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
  const next = () => {
    nextCalled = true;
  };
  return { req, res, next, result: () => ({ statusCode, body, nextCalled }) };
}

test("a token with a forged role claim is rejected", () => {
  const valid = jwt.sign({ userId: "steward-test", role: "STEWARD" }, SECRET, {
    expiresIn: "1h",
  });
  const [header, , signature] = valid.split(".");
  const forgedPayload = Buffer.from(
    JSON.stringify({ userId: "steward-test", role: "OPERATOR" }),
  ).toString("base64url");
  const forged = `${header}.${forgedPayload}.${signature}`;

  const { req, res, next, result } = mockReqRes(forged);
  requireAuth(req, res, next);

  assert.equal(result().nextCalled, false);
  assert.equal(result().statusCode, 401);
});

test("a valid token resolves the role server-side", () => {
  const token = jwt.sign(
    { userId: "operator-test", role: "OPERATOR" },
    SECRET,
    { expiresIn: "1h" },
  );
  const { req, res, next } = mockReqRes(token);
  requireAuth(req, res, next);

  assert.equal(req.user.role, "OPERATOR");
});
