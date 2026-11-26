import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../../src/validation/contract-validator.ts";

const create = {
  username: "operator-2",
  password: "a-long-password-2",
  role: "OPERATOR",
  lineGroup: "M1_M2",
};
const user = {
  userId: 1,
  username: "operator-2",
  role: "OPERATOR",
  lineGroup: "M1_M2",
  disabled: false,
};
const checkCreate = (body) => validate(body, "user-create.schema.json");
const checkUpdate = (body) => validate(body, "user-update.schema.json");
const checkUser = (body) => validate(body, "user.schema.json");

test("accepts a user to create", () => {
  assert.deepEqual(checkCreate(create), []);
});

test("rejects a user to create without one of its fields", () => {
  for (const field of Object.keys(create)) {
    const rest = { ...create };
    delete rest[field];
    assert.notDeepEqual(checkCreate(rest), [], field);
  }
});

test("rejects an empty username and a password under 12 characters", () => {
  assert.notDeepEqual(checkCreate({ ...create, username: "" }), []);
  assert.notDeepEqual(checkCreate({ ...create, password: "abcdefghij1" }), []);
  assert.deepEqual(checkCreate({ ...create, password: "abcdefghijk1" }), []);
});

test("rejects a password without a digit, wherever the digit is", () => {
  assert.notDeepEqual(checkCreate({ ...create, password: "abcdefghijkl" }), []);
  for (const password of ["1bcdefghijkl", "abcde1ghijkl", "abcdefghijk1"]) {
    assert.deepEqual(checkCreate({ ...create, password }), [], password);
  }
});

test("accepts every role and line group, and nothing else", () => {
  for (const role of ["STEWARD", "OPERATOR", "ADMIN"]) {
    assert.deepEqual(checkCreate({ ...create, role }), [], role);
  }
  for (const lineGroup of ["M1_M2", "M3_M4"]) {
    assert.deepEqual(checkCreate({ ...create, lineGroup }), [], lineGroup);
  }
  assert.notDeepEqual(checkCreate({ ...create, role: "ROOT" }), []);
  assert.notDeepEqual(checkCreate({ ...create, lineGroup: "M5" }), []);
});

test("rejects other fields on a user to create", () => {
  assert.notDeepEqual(checkCreate({ ...create, userId: 7 }), []);
});

test("accepts an edit of one field or several", () => {
  assert.deepEqual(checkUpdate({ password: "a-new-password-2" }), []);
  assert.deepEqual(checkUpdate({ role: "ADMIN" }), []);
  assert.deepEqual(checkUpdate({ lineGroup: "M3_M4" }), []);
  assert.deepEqual(checkUpdate({ role: "STEWARD", lineGroup: "M3_M4" }), []);
});

test("rejects an empty edit, a weak password and a new username", () => {
  assert.notDeepEqual(checkUpdate({}), []);
  assert.notDeepEqual(checkUpdate({ password: "short1" }), []);
  assert.notDeepEqual(checkUpdate({ password: "a-new-password" }), []);
  // The username cannot be changed.
  assert.notDeepEqual(checkUpdate({ username: "renamed" }), []);
});

test("accepts a returned user", () => {
  assert.deepEqual(checkUser(user), []);
});

test("rejects a returned user with a password or its hash", () => {
  assert.notDeepEqual(checkUser({ ...user, password: "a-long-password" }), []);
  assert.notDeepEqual(checkUser({ ...user, passwordHash: "$2b$10$abc" }), []);
});

test("rejects a returned user without one of its fields", () => {
  for (const field of Object.keys(user)) {
    const rest = { ...user };
    delete rest[field];
    assert.notDeepEqual(checkUser(rest), [], field);
  }
});
