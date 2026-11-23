import "dotenv/config";
import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { app } from "./app.js";
import { attachSocketHandlers } from "./realtime/socket-server.js";

const server = createServer(app);
const port = Number(process.env.PORT) || 3000;
const webDistDirectory = path.resolve(process.cwd(), "web/dist");
const webOrigins = (process.env.WEB_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: webOrigins,
    methods: ["GET", "POST"],
  },
});

// Lets controllers emit socket events through request.app.locals.io.
app.locals.io = io;

attachSocketHandlers(io);

app.use(express.static(webDistDirectory));
app.get("/{*path}", (_request, response) => {
  response.sendFile("index.html", { root: webDistDirectory });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`API and Socket.IO listening at http://localhost:${port}`);
});
