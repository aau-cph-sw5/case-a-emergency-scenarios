import test from "node:test";
import assert from "node:assert/strict";
import { InvalidCredentialsError, login } from "../../shared/auth/login.ts";

const API = "http://localhost:4010";

function mockFetch(status, body) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    };
  };
  return { fetchImpl, calls };
}

test("returns the token and role from a valid response", async () => {
  const { fetchImpl, calls } = mockFetch(200, {
    token: "abc",
    role: "STEWARD",
  });

  const session = await login(API, "steward-test", "pw", fetchImpl);

  assert.deepEqual(session, { token: "abc", role: "STEWARD" });
  assert.equal(calls[0].url, `${API}/api/v1/auth/login`);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    username: "steward-test",
    password: "pw",
  });
});

test("throws InvalidCredentialsError on 401", async () => {
  const { fetchImpl } = mockFetch(401, {
    error: { code: "E0102", message: "Invalid credentials" },
  });

  await assert.rejects(
    login(API, "steward-test", "wrong", fetchImpl),
    InvalidCredentialsError,
  );
});

test("throws an error with the status on other failures", async () => {
  const { fetchImpl } = mockFetch(500, {});

  await assert.rejects(login(API, "u", "p", fetchImpl), /500/);
});

test("rejects a response with an unknown role or no token", async () => {
  for (const body of [
    { token: "abc", role: "ADMIN" },
    { role: "OPERATOR" },
    [],
  ]) {
    const { fetchImpl } = mockFetch(200, body);
    await assert.rejects(login(API, "u", "p", fetchImpl), /unexpected format/);
  }
});
