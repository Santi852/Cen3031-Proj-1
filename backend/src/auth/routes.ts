import express from "express";
import { rateLimit } from "express-rate-limit";
import type { Pool } from "pg";
import { parseCredentials } from "./credentials.js";
import { requireAuth } from "./middleware.js";
import {
  hashPassword,
  verifyMissingUserPassword,
  verifyPassword,
} from "./passwords.js";
import { createTokenService, TOKEN_TTL_SECONDS } from "./tokens.js";
import { createUserStore, type User } from "./users.js";

export type AuthOptions = {
  database: Pick<Pool, "query">;
  jwtSecret: string;
  authRateLimit?: number;
};

export function createAuthRouter(options: AuthOptions) {
  const router = express.Router();
  const users = createUserStore(options.database);
  const tokens = createTokenService(options.jwtSecret);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.authRateLimit ?? 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Try again later." },
  });

  async function session(user: User) {
    return {
      user,
      accessToken: await tokens.issue(user.id),
      tokenType: "Bearer",
      expiresIn: TOKEN_TTL_SECONDS,
    };
  }

  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  router.post(["/signup", "/signin"], limiter, express.json({ limit: "16kb" }));

  router.post("/signup", async (req, res) => {
    const credentials = parseCredentials(req.body);
    if (!credentials) {
      res.status(400).json({
        error: "Enter a valid email and a password of 8 to 128 characters.",
      });
      return;
    }

    const passwordHash = await hashPassword(credentials.password);
    let user: User;
    try {
      user = await users.create(credentials.email, passwordHash);
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505" &&
        "constraint" in error &&
        error.constraint === "users_email_unique"
      ) {
        res
          .status(409)
          .json({ error: "An account with that email already exists." });
        return;
      }
      throw error;
    }
    res.status(201).json(await session(user));
  });

  router.post("/signin", async (req, res) => {
    const credentials = parseCredentials(req.body);
    if (!credentials) {
      res.status(400).json({
        error: "Enter a valid email and a password of 8 to 128 characters.",
      });
      return;
    }

    const user = await users.findByEmail(credentials.email);
    const valid = user
      ? await verifyPassword(user.password_hash, credentials.password)
      : await verifyMissingUserPassword(credentials.password);
    if (!user || !valid) {
      res.status(401).json({ error: "Incorrect email or password." });
      return;
    }
    res.json(await session({ id: user.id, email: user.email }));
  });

  router.get("/me", requireAuth(users, tokens), (_req, res) => {
    res.json({ user: res.locals.user });
  });

  return router;
}
