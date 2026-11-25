import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app.js";
import { attachSocketHandlers } from "../../src/realtime/socket-server.js";
import type { SnapshotStorage } from "../../shared/offline/scenario-snapshot.js";

export type TestServerHandle = {
  baseUrl: string;
  openSocket: (token: string) => Promise<Socket>;
  close: () => Promise<void>;
};

export async function startTestServer(): Promise<TestServerHandle> {
  const httpServer: HttpServer = createServer(app);
  const io = new Server(httpServer);
  app.locals.io = io;
  attachSocketHandlers(io);

  await new Promise<void>((resolve) =>
    httpServer.listen(0, "127.0.0.1", () => resolve()),
  );
  const baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  const openSockets: Socket[] = [];

  return {
    baseUrl,
    openSocket(token: string): Promise<Socket> {
      const socket = connect(baseUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: false,
      });
      openSockets.push(socket);
      return new Promise<Socket>((resolve, reject) => {
        socket.once("welcome", () => resolve(socket));
        socket.once("connect_error", reject);
      });
    },
    async close() {
      for (const socket of openSockets) socket.disconnect();
      delete app.locals.io;
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}

export async function login(
  baseUrl: string,
  username: string,
  password: string,
  client: "web" | "mobile",
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

export function api(
  baseUrl: string,
  path: string,
  token: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function assertError(
  response: Response,
  status: number,
  code: string,
) {
  assert.equal(response.status, status);
  const body = (await response.json()) as { error?: { code?: string } };
  assert.equal(body.error?.code, code);
}

export async function checkIn(
  baseUrl: string,
  token: string,
  activationId: number,
  station: string,
) {
  for (const event of ["EN_ROUTE", "ARRIVED"] as const) {
    const response = await api(
      baseUrl,
      "/api/v1/position-reports",
      token,
      "POST",
      {
        activationId,
        staff: "ignored-by-server",
        station,
        reportedAt: new Date().toISOString(),
        event,
      },
    );
    assert.equal(response.status, 202);
  }
}

export function nextEvent<T>(
  socket: Socket,
  event: string,
  ms = 3000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event ${event}`)),
      ms,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export function recordEvents(socket: Socket, event: string) {
  const received: unknown[] = [];
  const listener = (payload: unknown) => {
    received.push(payload);
  };
  socket.on(event, listener);
  return {
    received,
    stop: () => socket.off(event, listener),
  };
}

export const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

export function memoryStorage(): SnapshotStorage {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}
