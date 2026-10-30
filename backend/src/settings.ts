import express from "express";
import { type AuthOptions } from "./auth/routes.js";
import { createUserStore } from "./auth/users.js";
import { createTokenService } from "./auth/tokens.js";
import { requireAuth } from "./auth/middleware.js";
import { ApiError } from "./leetcode.js";

export function createSettingsRouter(options: AuthOptions) {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.use(
    requireAuth(
      createUserStore(options.database),
      createTokenService(options.jwtSecret),
    ),
  );
  router.use(express.json({ limit: "1kb" }));
  router.get("/timezone", async (_req, res) => {
    const result = await options.database.query(
      "SELECT time_zone FROM users WHERE id=$1",
      [res.locals.user.id],
    );
    res.json({ timeZone: result.rows[0].time_zone });
  });
  router.put("/timezone", async (req, res) => {
    const timeZone = req.body?.timeZone;
    if (
      typeof timeZone !== "string" ||
      timeZone.length > 100 ||
      (timeZone !== "UTC" && !timeZone.includes("/"))
    )
      throw new ApiError(400, "invalid", "Choose a valid IANA timezone.");
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format();
    } catch {
      throw new ApiError(400, "invalid", "Choose a valid IANA timezone.");
    }
    await options.database.query("UPDATE users SET time_zone=$2 WHERE id=$1", [
      res.locals.user.id,
      timeZone,
    ]);
    res.json({ timeZone });
  });
  return router;
}
