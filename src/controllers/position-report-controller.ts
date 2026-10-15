import type { Request, Response } from "express";

export function postPositionReport(request: Request, response: Response) {
  console.log("Position report received:", request.body);
  response.status(202).json({ accepted: true });
}
