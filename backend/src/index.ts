import "dotenv/config";
import { Pool } from "pg";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const database = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
  max: 10,
});
database.on("error", () => console.error("Database connection failed."));
const app = createApp({
  database,
  jwtSecret: config.jwtSecret,
  frontendOrigin: config.frontendOrigin,
});
const server = app.listen(config.port, () =>
  console.log(`API on http://localhost:${config.port}`),
);

function shutdown() {
  server.close(() => {
    void database.end();
  });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
