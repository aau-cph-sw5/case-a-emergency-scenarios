import type { Request, Response } from "express";
import type { Server } from "socket.io";
import type { AuthUser } from "../services/auth-service.js";

export function postPositionReport(request: Request, response: Response) {
  const { userId } = response.locals.user as AuthUser;
  const report = { ...request.body, staff: userId };

  const io = request.app.locals.io as Server | undefined;
  
  io?.emit("position-report", { ...report, sentAt: new Date().toISOString() });

  console.log("Position report received:", report);
  response.status(202).json({ accepted: true });
}