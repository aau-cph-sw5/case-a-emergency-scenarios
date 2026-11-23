import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { attachSocketHandlers } from "../../src/realtime/socket-server.js";
import { validate } from "../../src/validation/contract-validator.js";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { closeOwnerDatabase, getOwnerDatabase } from "./helpers.js";

// Admins create and edit accounts (MET-A-030).
const owner = getOwnerDatabase();
const PREFIX = "users-";
const CREATED = `${PREFIX}created`;

let server: HttpServer;
let baseUrl: string;
let adminId: number;
const sockets: Socket[] = [];

before(async () => {
  await owner`DELETE FROM users WHERE username LIKE ${`${CREATED}%`}`;
  const users = await seedTestUsers(PREFIX);
  adminId = users.find((user) => user.role === "ADMIN")!.id;

  server = createServer(app);
  const io = new Server(server);
  app.locals.io = io;
  attachSocketHandlers(io);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  const io = app.locals.io as Server;
  delete app.locals.io;
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await owner`DELETE FROM users WHERE username LIKE ${`${CREATED}%`}`;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
  await closeOwnerDatabase();
});

async function login(
  username: string,
  password: string,
  client: "web" | "mobile" = "web",
) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return {
    status: response.status,
    token: ((await response.json()) as { token?: string }).token ?? "",
  };
}

async function tokenFor(
  username: string,
  password: string,
  client?: "web" | "mobile",
) {
  const { status, token } = await login(username, password, client);
  assert.equal(status, 200, `login as ${username}`);
  return token;
}

const adminToken = () => tokenFor(`${PREFIX}admin`, "admin123");

function request(
  method: "GET" | "POST" | "PATCH",
  path: string,
  token: string,
  body?: unknown,
) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function me(token: string) {
  return fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Resolves with the connected socket, or rejects with connect_error.
function open(token: string) {
  const socket = connect(baseUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(socket);
  return new Promise<Socket>((resolve, reject) => {
    socket.once("welcome", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

async function createAccount(
  token: string,
  username: string,
  role = "OPERATOR",
  lineGroup = "M1_M2",
) {
  const response = await request("POST", "/api/v1/users", token, {
    username,
    password: "first-password-1",
    role,
    lineGroup,
  });
  assert.equal(response.status, 201);
  return (await response.json()) as { userId: number; username: string };
}

test("only an admin may list, create or edit users", async () => {
  const tokens = [
    await tokenFor(`${PREFIX}operator`, "operator123"),
    await tokenFor(`${PREFIX}steward`, "steward123", "mobile"),
  ];
  for (const token of tokens) {
    for (const response of [
      await request("GET", "/api/v1/users", token),
      await request("POST", "/api/v1/users", token, {
        username: `${CREATED}-refused`,
        password: "a-long-password-1",
        role: "ADMIN",
        lineGroup: "M1_M2",
      }),
      // An invalid body is refused for the role first, so it reveals nothing.
      await request("PATCH", `/api/v1/users/${adminId}`, token, {}),
    ]) {
      assert.equal(response.status, 403);
      assert.equal(
        (await response.json()).error.code,
        ERROR_CODES.ROLE_NOT_PERMITTED,
      );
    }
  }
  const [refused] = await owner`
    SELECT 1 FROM users WHERE username = ${`${CREATED}-refused`}
  `;
  assert.equal(refused, undefined);
});

test("the list has every account in the contract's shape, without passwords", async () => {
  const response = await request("GET", "/api/v1/users", await adminToken());
  assert.equal(response.status, 200);
  const users = (await response.json()) as Record<string, unknown>[];

  const ours = users.filter((user) => String(user.username).startsWith(PREFIX));
  assert.deepEqual(
    ours.map((user) => user.username),
    [
      `${PREFIX}admin`,
      `${PREFIX}operator`,
      `${PREFIX}operator-m3m4`,
      `${PREFIX}steward`,
      `${PREFIX}steward-m3m4`,
    ],
  );
  for (const user of users) {
    // user.schema.json allows no other fields, so a password hash fails it.
    assert.deepEqual(validate(user, "user.schema.json"), []);
  }
});

test("an admin creates a user who can then sign in", async () => {
  const response = await request("POST", "/api/v1/users", await adminToken(), {
    username: CREATED,
    password: "first-password-1",
    role: "OPERATOR",
    lineGroup: "M3_M4",
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.deepEqual(validate(created, "user.schema.json"), []);
  assert.equal(created.username, CREATED);
  assert.equal(created.lineGroup, "M3_M4");

  const session = await login(CREATED, "first-password-1");
  assert.equal(session.status, 200);
  const signedIn = await (await me(session.token)).json();
  assert.deepEqual(signedIn, {
    userId: created.userId,
    role: "OPERATOR",
    lineGroup: "M3_M4",
  });
});

test("a taken username is refused regardless of casing", async () => {
  const response = await request("POST", "/api/v1/users", await adminToken(), {
    username: `${PREFIX}OPERATOR`,
    password: "a-long-password-1",
    role: "OPERATOR",
    lineGroup: "M1_M2",
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, ERROR_CODES.CONFLICT);
});

test("a body that does not match the contract is refused", async () => {
  const token = await adminToken();
  for (const [method, path, body] of [
    [
      "POST",
      "/api/v1/users",
      {
        username: `${CREATED}-short`,
        password: "short",
        role: "OPERATOR",
        lineGroup: "M1_M2",
      },
    ],
    [
      "POST",
      "/api/v1/users",
      {
        // 11 characters with a digit: one short of the minimum.
        username: `${CREATED}-eleven`,
        password: "abcdefghij1",
        role: "OPERATOR",
        lineGroup: "M1_M2",
      },
    ],
    [
      "POST",
      "/api/v1/users",
      {
        username: `${CREATED}-no-digit`,
        password: "a-long-password",
        role: "OPERATOR",
        lineGroup: "M1_M2",
      },
    ],
    [
      "POST",
      "/api/v1/users",
      {
        username: `${CREATED}-role`,
        password: "a-long-password-1",
        role: "ROOT",
        lineGroup: "M1_M2",
      },
    ],
    ["PATCH", `/api/v1/users/${adminId}`, {}],
    ["PATCH", `/api/v1/users/${adminId}`, { username: "renamed" }],
    // An edit may not set a weaker password than creating an account.
    ["PATCH", `/api/v1/users/${adminId}`, { password: "abcdefghij1" }],
    ["PATCH", `/api/v1/users/${adminId}`, { password: "a-long-password" }],
  ] as const) {
    const response = await request(method, path, token, body);
    assert.equal(response.status, 400, `${method} ${JSON.stringify(body)}`);
  }
});

test("an edit takes effect and the new password signs in", async () => {
  const admin = await adminToken();
  const user = await createAccount(admin, `${CREATED}-edited`);

  const response = await request(
    "PATCH",
    `/api/v1/users/${user.userId}`,
    admin,
    { lineGroup: "M3_M4", password: "second-password-2" },
  );
  assert.equal(response.status, 200);
  const edited = await response.json();
  assert.deepEqual(validate(edited, "user.schema.json"), []);
  assert.equal(edited.lineGroup, "M3_M4");
  assert.equal(edited.role, "OPERATOR");

  // The old password no longer works; the new one signs in with the new values.
  assert.equal((await login(user.username, "first-password-1")).status, 401);
  const fresh = await tokenFor(user.username, "second-password-2");
  assert.equal((await (await me(fresh)).json()).lineGroup, "M3_M4");
});

test("an edit that changes only the role keeps the password", async () => {
  const admin = await adminToken();
  const user = await createAccount(admin, `${CREATED}-promoted`);

  const response = await request(
    "PATCH",
    `/api/v1/users/${user.userId}`,
    admin,
    { role: "ADMIN" },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).role, "ADMIN");
  assert.equal((await login(user.username, "first-password-1")).status, 200);
});

test("an edit signs the user out and closes their sockets, but no one else's", async () => {
  const admin = await adminToken();
  const user = await createAccount(admin, `${CREATED}-signed-out`);
  const userToken = await tokenFor(user.username, "first-password-1");
  const userSocket = await open(userToken);
  const adminSocket = await open(admin);
  const disconnected = new Promise<string>((resolve) =>
    userSocket.once("disconnect", resolve),
  );

  const response = await request(
    "PATCH",
    `/api/v1/users/${user.userId}`,
    admin,
    { lineGroup: "M3_M4" },
  );
  assert.equal(response.status, 200);

  // The old token is refused, and the open socket is closed by the server.
  assert.equal((await me(userToken)).status, 401);
  assert.equal(await disconnected, "io server disconnect");
  await assert.rejects(open(userToken), { message: "E0001" });
  // The admin who made the edit is not affected.
  assert.equal((await me(admin)).status, 200);
  assert.equal(adminSocket.connected, true);

  // Signing in again gives the new line group.
  const fresh = await tokenFor(user.username, "first-password-1");
  assert.equal((await (await me(fresh)).json()).lineGroup, "M3_M4");
});

test("an admin who edits their own account is signed out", async () => {
  const token = await adminToken();
  const [before] = await owner<{ lineGroup: string }[]>`
    SELECT line_group AS "lineGroup" FROM users WHERE id = ${adminId}
  `;
  const other = before.lineGroup === "M1_M2" ? "M3_M4" : "M1_M2";

  const response = await request("PATCH", `/api/v1/users/${adminId}`, token, {
    lineGroup: other,
  });
  assert.equal(response.status, 200);
  assert.equal((await me(token)).status, 401);

  // Put the line group back for the other tests.
  await owner`UPDATE users SET line_group = ${before.lineGroup} WHERE id = ${adminId}`;
});

test("an unknown user cannot be edited", async () => {
  const token = await adminToken();
  for (const id of ["2147483647", "not-a-number", "0"]) {
    const response = await request("PATCH", `/api/v1/users/${id}`, token, {
      lineGroup: "M1_M2",
    });
    assert.equal(response.status, 404, id);
    assert.equal((await response.json()).error.code, ERROR_CODES.NOT_FOUND);
  }
});

test("an admin cannot change their own role, and nothing is changed", async () => {
  const token = await adminToken();
  const response = await request("PATCH", `/api/v1/users/${adminId}`, token, {
    role: "OPERATOR",
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, ERROR_CODES.CONFLICT);

  // Refused before anything was written, so the admin is still signed in.
  assert.equal((await me(token)).status, 200);
  const [stored] = await owner<{ role: string }[]>`
    SELECT role FROM users WHERE id = ${adminId}
  `;
  assert.equal(stored.role, "ADMIN");
});
