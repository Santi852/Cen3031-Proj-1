import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { createAuthRouter, type AuthOptions } from "./auth/routes.js";

export function createApp(options: AuthOptions & { frontendOrigin?: string }) {
  const app = express();
  app.disable("x-powered-by");
  const frontendOrigin = options.frontendOrigin ?? "http://localhost:5173";
  app.use(
    cors({
      origin: (origin, callback) => callback(null, origin === frontendOrigin),
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", createAuthRouter(options));
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  const handleError: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    next,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const type =
      error !== null && typeof error === "object" && "type" in error
        ? error.type
        : undefined;
    if (type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON body." });
    } else if (type === "entity.too.large") {
      res.status(413).json({ error: "Request body is too large." });
    } else {
      console.error("API request failed.");
      res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  };
  app.use(handleError);
  return app;
}
