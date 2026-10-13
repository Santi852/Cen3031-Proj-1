import { createTokenService } from "./auth/tokens.js";

export function readConfig(environment: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    throw new Error("Set DATABASE_URL to a PostgreSQL connection URL.");
  }
  const jwtSecret = environment.JWT_SECRET ?? "";
  createTokenService(jwtSecret);

  const port = environment.PORT === undefined ? 3001 : Number(environment.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const frontendOrigin = environment.FRONTEND_ORIGIN ?? "http://localhost:5173";
  let origin: URL;
  try {
    origin = new URL(frontendOrigin);
  } catch {
    throw new Error("FRONTEND_ORIGIN must be a full HTTP or HTTPS origin.");
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.origin !== frontendOrigin
  ) {
    throw new Error(
      "FRONTEND_ORIGIN must be a full HTTP or HTTPS origin without a path.",
    );
  }
  return { databaseUrl, jwtSecret, port, frontendOrigin };
}
