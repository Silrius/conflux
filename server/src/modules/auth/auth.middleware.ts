import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./auth.tokens";

export type AuthedRequest = Request & { user?: { id: string; username: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing access token" });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/expired access token" });
  }
}
