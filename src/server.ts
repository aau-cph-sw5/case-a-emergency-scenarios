import "dotenv/config";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import { app } from "./app.js";

const server = createServer(app);
const port = Number(process.env.PORT) || 3000;
const webDistDirectory = fileURLToPath(
  new URL("../web/dist/", import.meta.url),
);
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

app.locals.io = io;

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.emit("welcome", "Connected to the emergency scenarios server.");

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id, reason);
  });
});

app.use(express.static(webDistDirectory));
app.get("/{*path}", (_request, response) => {
  response.sendFile("index.html", { root: webDistDirectory });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`API and Socket.IO listening at http://localhost:${port}`);
});
