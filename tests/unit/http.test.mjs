import test from "node:test";
import assert from "node:assert/strict";
import { FormatError, HttpError, getJson } from "../../shared/api/http.ts";

const API = "http://localhost:4010";
const isList = (data) => Array.isArray(data);

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

test("getJson sends the token and returns a valid answer", async () => {
  const { fetchImpl, calls } = mockFetch(200, [1, 2]);

  assert.deepEqual(
    await getJson(API, "/api/v1/scenarios", "abc", isList, fetchImpl),
    [1, 2],
  );
  assert.equal(calls[0].url, `${API}/api/v1/scenarios`);
  assert.equal(calls[0].init.headers.Authorization, "Bearer abc");
});

test("getJson throws an HttpError with the status", async () => {
  const { fetchImpl } = mockFetch(503, {});

  await assert.rejects(
    getJson(API, "/api/v1/scenarios", "abc", isList, fetchImpl),
    (error) =>
      error instanceof HttpError &&
      error.status === 503 &&
      error.message === "GET /api/v1/scenarios failed with 503",
  );
});

test("getJson throws a FormatError for an answer that fails the check", async () => {
  const { fetchImpl } = mockFetch(200, { not: "a list" });

  await assert.rejects(
    getJson(API, "/api/v1/scenarios", "abc", isList, fetchImpl),
    FormatError,
  );
});
