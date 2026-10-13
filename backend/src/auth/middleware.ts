import type { RequestHandler } from "express";
import type { createTokenService } from "./tokens.js";
import type { createUserStore } from "./users.js";

export function requireAuth(
  users: ReturnType<typeof createUserStore>,
  tokens: ReturnType<typeof createTokenService>,
): RequestHandler {
  return async (req, res, next) => {
    const token = /^Bearer ([^\s]+)$/i.exec(
      req.get("Authorization") ?? "",
    )?.[1];
    let userId: string;
    try {
      if (!token) throw new Error("Missing token");
      userId = await tokens.verify(token);
    } catch {
      res.set("WWW-Authenticate", "Bearer");
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const user = await users.findById(userId);
    if (!user) {
      res.set("WWW-Authenticate", "Bearer");
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.locals.user = user;
    next();
  };
}
