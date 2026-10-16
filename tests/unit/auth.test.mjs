import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { requireAuth } from "../../src/middleware/require-auth.ts";

const SECRET = process.env.JWT_SECRET || "local-dev-secret-not-for-production";

function mockReqRes(token) {
  const req = { headers: { authorization: token ? `Bearer ${token}` : "" } };
  let statusCode,
    body,
    nextCalled = false;
  const res = {
    locals: {},
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

function rejects(token) {
  const { req, res, next, result } = mockReqRes(token);
  requireAuth(req, res, next);
  assert.equal(result().nextCalled, false);
  assert.equal(result().statusCode, 401);
  assert.equal(result().body.error.code, "E0001");
}

test("a token with a forged role claim is rejected", () => {
  const valid = jwt.sign({ userId: "steward-test", role: "STEWARD" }, SECRET, {
    expiresIn: "1h",
  });
  const [header, , signature] = valid.split(".");
  const forgedPayload = Buffer.from(
    JSON.stringify({ userId: "steward-test", role: "OPERATOR" }),
  ).toString("base64url");

  rejects(`${header}.${forgedPayload}.${signature}`);
});

test("a token signed with another secret is rejected", () => {
  rejects(
    jwt.sign({ userId: "operator-test", role: "OPERATOR" }, "another-secret"),
  );
});

test("an expired token is rejected", () => {
  rejects(
    jwt.sign({ userId: "operator-test", role: "OPERATOR" }, SECRET, {
      expiresIn: -10,
    }),
  );
});

test("a missing token is rejected", () => {
  rejects(undefined);
});

test("a valid token resolves the role server-side", () => {
  const token = jwt.sign(
    { userId: "operator-test", role: "OPERATOR" },
    SECRET,
    { expiresIn: "1h" },
  );
  const { req, res, next, result } = mockReqRes(token);
  requireAuth(req, res, next);

  assert.equal(result().nextCalled, true);
  assert.deepEqual(res.locals.user, {
    userId: "operator-test",
    role: "OPERATOR",
  });
});
