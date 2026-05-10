import { Request, Response, NextFunction } from "express";
import { env } from "../env.js";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const token = (req.headers["x-api-key"] as string | undefined)?.trim();

  if (!token) {
    res.status(401).json({
      status: "error",
      type: "unauthorized",
      message: "Missing X-API-Key header",
    });
    return;
  }

  if (token !== env.API_SECRET_KEY) {
    res.status(401).json({
      status: "error",
      type: "unauthorized",
      message: "Invalid API key",
    });
    return;
  }

  next();
}
