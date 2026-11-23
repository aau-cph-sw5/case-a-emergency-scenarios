import type { Request, Response } from "express";
import { findMetroLine } from "../repositories/fixture-repository.js";

export function getMetroLine(
  request: Request<{ lineId: string }>,
  response: Response,
) {
  const line = findMetroLine(request.params.lineId);
  if (line === undefined) {
    response.status(404).json({ error: "Metro line not found" });
    return;
  }
  response.json(line);
}
