import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { verify } from "argon2";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { runner } from "node-pg-migrate";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl?.trim()) {
  throw new Error(
    "Set TEST_DATABASE_URL to a PostgreSQL test database before running test:db. DATABASE_URL is never used by these tests.",
  );
}

const schema = `stacksprint_auth_test_${randomUUID().replaceAll("-", "")}`;
const jwtSecret = `test-only-${randomUUID()}-${randomUUID()}`;
const signingKey = new TextEncoder().encode(jwtSecret);
const frontendOrigin = "http://localhost:5173";
const password = "a strong test password";
const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
});
const database = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
  options: `-c search_path=${schema}`,
});
const servers = new Set<Server>();
let connected = false;
let schemaCreated = false;
let baseUrl: string;

interface AuthResponse {
  user: { id: string; email: string };
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

async function startServer(authRateLimit = 1000) {
  const app = createApp({
    database,
    jwtSecret,
    frontendOrigin,
    authRateLimit,
  });
  const server = app.listen(0, "127.0.0.1");
  servers.add(server);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function post(
  path: string,
  body: unknown,
  url = baseUrl,
  headers: Record<string, string> = {},
) {
  return fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function signup(email = `${randomUUID()}@example.com`, value = password) {
  const response = await post("/api/auth/signup", { email, password: value });
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return (await response.json()) as AuthResponse;
}

function getMe(token?: string) {
  return fetch(`${baseUrl}/api/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function expectError(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("application/json");
  const body = (await response.json()) as { error: string };
  expect(body).toEqual({ error: expect.any(String) });
  expect(body.error.length).toBeGreaterThan(0);
  expect(JSON.stringify(body)).not.toContain(jwtSecret);
  expect(JSON.stringify(body)).not.toContain(password);
  expect(JSON.stringify(body)).not.toContain("password_hash");
  return body;
}

function signToken(payload: JWTPayload, algorithm = "HS256") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: algorithm, typ: "JWT" })
    .sign(signingKey);
}

describe(
  "Authentication HTTP API with PostgreSQL",
  { concurrent: false },
  () => {
    beforeAll(async () => {
      await client.connect();
      connected = true;
      await client.query(`CREATE SCHEMA "${schema}"`);
      schemaCreated = true;
      await runner({
        dbClient: client,
        dir: fileURLToPath(new URL("../migrations", import.meta.url)),
        direction: "up",
        schema,
        migrationsSchema: schema,
        migrationsTable: "pgmigrations",
        singleTransaction: true,
        advisoryLockMode: "wait",
        log: () => undefined,
      });
      baseUrl = await startServer();
    }, 30_000);

    beforeEach(async () => {
      await client.query(`TRUNCATE "${schema}".users CASCADE`);
    });

    afterAll(async () => {
      try {
        await Promise.all(
          [...servers].map(
            (server) =>
              new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
                server.closeIdleConnections();
              }),
          ),
        );
      } finally {
        await database.end();
        if (connected) {
          try {
            if (schemaCreated)
              await client.query(`DROP SCHEMA "${schema}" CASCADE`);
          } finally {
            await client.end();
          }
        }
      }
    });

    it("persists a normalized account with an Argon2id hash and issues a one-hour token", async () => {
      const account = await signup("  Matias@EXAMPLE.com  ");
      expect(account).toEqual({
        user: { id: expect.any(String), email: "matias@example.com" },
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 3600,
      });
      expect(account.user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      const result = await database.query<{
        id: string;
        email: string;
        password_hash: string;
      }>("SELECT id, email, password_hash FROM users");
      expect(result.rows).toHaveLength(1);
      const persisted = result.rows[0]!;
      expect(persisted.id).toBe(account.user.id);
      expect(persisted.email).toBe(account.user.email);
      expect(persisted.password_hash).toMatch(/^\$argon2id\$/);
      expect(persisted.password_hash).not.toBe(password);
      expect(await verify(persisted.password_hash, password)).toBe(true);
      expect(await verify(persisted.password_hash, "wrong password")).toBe(
        false,
      );
      for (const secret of [password, jwtSecret, persisted.password_hash]) {
        expect(JSON.stringify(account)).not.toContain(secret);
      }

      const { payload, protectedHeader } = await jwtVerify(
        account.accessToken,
        signingKey,
        {
          issuer: "stacksprint",
          audience: "stacksprint-api",
          algorithms: ["HS256"],
          requiredClaims: ["exp", "iat", "sub"],
        },
      );
      expect(protectedHeader.alg).toBe("HS256");
      expect(payload.sub).toBe(account.user.id);
      expect(payload.exp! - payload.iat!).toBe(3600);
      for (const secret of [password, jwtSecret, persisted.password_hash]) {
        expect(JSON.stringify(payload)).not.toContain(secret);
      }

      const response = await getMe(account.accessToken);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ user: account.user });
    });

    it("signs in against persisted data from another app instance", async () => {
      const account = await signup("member@example.com");
      const anotherUrl = await startServer();
      const response = await post(
        "/api/auth/signin",
        { email: "  MEMBER@EXAMPLE.COM ", password },
        anotherUrl,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const body = (await response.json()) as AuthResponse;
      expect(body).toEqual({
        user: account.user,
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 3600,
      });
      expect((await getMe(body.accessToken)).status).toBe(200);
    });

    it("rejects a duplicate email regardless of case and preserves the original password", async () => {
      await signup("member@example.com");
      await expectError(
        await post("/api/auth/signup", {
          email: " MEMBER@EXAMPLE.COM ",
          password: "replacement password",
        }),
        409,
      );
      const result = await database.query<{ password_hash: string }>(
        "SELECT password_hash FROM users",
      );
      expect(result.rows).toHaveLength(1);
      expect(await verify(result.rows[0]!.password_hash, password)).toBe(true);
    });

    it("allows only one of two concurrent signups for the same email", async () => {
      const responses = await Promise.all([
        post("/api/auth/signup", { email: "race@example.com", password }),
        post("/api/auth/signup", { email: "RACE@EXAMPLE.COM", password }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      for (const response of responses) {
        if (response.status === 409) await expectError(response, 409);
        else await response.json();
      }
      expect((await database.query("SELECT id FROM users")).rows).toHaveLength(
        1,
      );
    });

    it("returns the same login failure for wrong passwords and unknown accounts", async () => {
      await signup("member@example.com");
      const wrong = await expectError(
        await post("/api/auth/signin", {
          email: "member@example.com",
          password: "incorrect password",
        }),
        401,
      );
      const unknown = await expectError(
        await post("/api/auth/signin", {
          email: "unknown@example.com",
          password,
        }),
        401,
      );
      expect(wrong).toEqual({ error: "Incorrect email or password." });
      expect(unknown).toEqual(wrong);
    });

    it.each(["/api/auth/signup", "/api/auth/signin"])(
      "%s rejects missing, malformed, oversized, and incorrectly typed input",
      async (path) => {
        for (const body of [
          {},
          null,
          [],
          { email: "member@example.com" },
          { password },
          { email: 123, password },
          { email: "member@example.com", password: 123 },
          { email: "not-an-email", password },
          { email: "member @example.com", password },
          { email: "member@example", password },
          { email: "' OR 1=1; DROP TABLE users; --", password },
          { email: "member@example.com", password: "short" },
          { email: "member@example.com", password: "a".repeat(129) },
        ]) {
          await expectError(await post(path, body), 400);
        }
        for (const body of [undefined, '{"email":']) {
          const response = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            ...(body === undefined ? {} : { body }),
          });
          await expectError(response, 400);
        }
        await expectError(
          await post(path, {
            email: "member@example.com",
            password: "a".repeat(262144),
          }),
          413,
        );
        expect((await database.query("SELECT id FROM users")).rows).toEqual([]);
      },
    );

    it("counts Unicode code points for password limits and preserves password whitespace", async () => {
      for (const value of ["😀".repeat(8), "😀".repeat(128), "  password  "]) {
        const email = `${randomUUID()}@example.com`;
        await signup(email, value);
        const response = await post("/api/auth/signin", {
          email,
          password: value,
        });
        expect(response.status).toBe(200);
        await response.json();
        if (value !== value.trim()) {
          await expectError(
            await post("/api/auth/signin", { email, password: value.trim() }),
            401,
          );
        }
      }
      for (const value of ["😀".repeat(7), "😀".repeat(129)]) {
        await expectError(
          await post("/api/auth/signup", {
            email: `${randomUUID()}@example.com`,
            password: value,
          }),
          400,
        );
      }
      expect((await database.query("SELECT id FROM users")).rows).toHaveLength(
        3,
      );
    });

    it("requires a valid Bearer token and rejects a tampered signature", async () => {
      const account = await signup();
      await expectError(await getMe(), 401);
      for (const authorization of [
        "Bearer",
        "Basic dXNlcjpwYXNz",
        `Bearer ${account.accessToken} extra`,
        "Bearer not-a-jwt",
      ]) {
        await expectError(
          await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: authorization },
          }),
          401,
        );
      }
      const [header, payload, signature] = account.accessToken.split(".");
      const modifiedPayload = Buffer.from(
        JSON.stringify({
          ...JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")),
          sub: randomUUID(),
        }),
      ).toString("base64url");
      await expectError(
        await getMe(`${header}.${modifiedPayload}.${signature}`),
        401,
      );
    });

    it("rejects expired tokens, wrong claims, missing required claims, and other algorithms", async () => {
      const account = await signup();
      const now = Math.floor(Date.now() / 1000);
      const claims: JWTPayload = {
        sub: account.user.id,
        iss: "stacksprint",
        aud: "stacksprint-api",
        iat: now,
        exp: now + 3600,
      };
      const invalidClaims: JWTPayload[] = [
        { ...claims, iat: now - 7200, exp: now - 3600 },
        { ...claims, iss: "another-issuer" },
        { ...claims, aud: "another-api" },
        { ...claims, sub: "not-a-uuid" },
        { ...claims, sub: "' OR 1=1 --" },
      ];
      for (const required of ["exp", "iat", "sub"]) {
        const missing = { ...claims };
        delete missing[required];
        invalidClaims.push(missing);
      }
      for (const payload of invalidClaims) {
        await expectError(await getMe(await signToken(payload)), 401);
      }
      await expectError(await getMe(await signToken(claims, "HS384")), 401);
    });

    it("rejects a previously valid token after its user is deleted", async () => {
      const account = await signup();
      await database.query("DELETE FROM users WHERE id = $1", [
        account.user.id,
      ]);
      await expectError(await getMe(account.accessToken), 401);
    });

    it("returns generic JSON errors when PostgreSQL cannot serve the request", async () => {
      const account = await signup();
      await client.query(
        `ALTER TABLE "${schema}".users RENAME TO unavailable_users`,
      );
      try {
        const responses = [
          await post("/api/auth/signup", {
            email: "another@example.com",
            password,
          }),
          await post("/api/auth/signin", {
            email: account.user.email,
            password,
          }),
          await getMe(account.accessToken),
        ];
        for (const response of responses) {
          const body = await expectError(response, 500);
          expect(body.error).not.toMatch(
            /relation|users|select|insert|postgres|stack/i,
          );
        }
      } finally {
        await client.query(
          `ALTER TABLE "${schema}".unavailable_users RENAME TO users`,
        );
      }
    });

    it("limits authentication attempts across endpoints even when X-Forwarded-For changes", async () => {
      const limitedUrl = await startServer(2);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await expectError(
          await post(
            "/api/auth/signin",
            { email: "unknown@example.com", password },
            limitedUrl,
            { "X-Forwarded-For": `198.51.100.${attempt + 1}` },
          ),
          401,
        );
      }
      const limited = await post(
        "/api/auth/signup",
        { email: "blocked@example.com", password },
        limitedUrl,
        { "X-Forwarded-For": "203.0.113.10" },
      );
      await expectError(limited, 429);
      expect(limited.headers.get("retry-after")).not.toBeNull();
      expect((await database.query("SELECT id FROM users")).rows).toEqual([]);
    });

    it("allows the configured frontend origin and Authorization preflights", async () => {
      const allowed = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: frontendOrigin },
      });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("access-control-allow-origin")).toBe(
        frontendOrigin,
      );
      await allowed.json();

      const preflight = await fetch(`${baseUrl}/api/auth/me`, {
        method: "OPTIONS",
        headers: {
          Origin: frontendOrigin,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
      });
      expect(preflight.ok).toBe(true);
      expect(preflight.headers.get("access-control-allow-origin")).toBe(
        frontendOrigin,
      );
      expect(
        preflight.headers.get("access-control-allow-headers")?.toLowerCase(),
      ).toContain("authorization");
      expect(
        preflight.headers.get("access-control-allow-headers")?.toLowerCase(),
      ).toContain("content-type");

      const unallowed = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: "https://unallowed.example" },
      });
      expect(unallowed.headers.get("access-control-allow-origin")).toBeNull();
      await unallowed.text();
    });
  },
);
