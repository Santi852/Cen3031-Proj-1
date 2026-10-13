import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

const valid = {
  DATABASE_URL: "postgres://test:test@localhost/stacksprint_test",
  JWT_SECRET: "config-test-only-secret-with-at-least-32-bytes",
};

describe("server configuration", () => {
  it("defaults to the local frontend and API port", () => {
    expect(readConfig(valid)).toEqual({
      databaseUrl: valid.DATABASE_URL,
      jwtSecret: valid.JWT_SECRET,
      port: 3001,
      frontendOrigin: "http://localhost:5173",
    });
  });

  it("rejects missing database URLs and placeholder signing secrets", () => {
    expect(() => readConfig({ JWT_SECRET: valid.JWT_SECRET })).toThrow(
      "DATABASE_URL",
    );
    expect(() =>
      readConfig({ ...valid, DATABASE_URL: "https://example.com" }),
    ).toThrow("DATABASE_URL");
    for (const secret of [
      undefined,
      "short",
      "replace-with-a-long-random-string",
    ]) {
      expect(() => readConfig({ ...valid, JWT_SECRET: secret })).toThrow();
    }
  });

  it("rejects invalid ports and origins that browsers cannot match", () => {
    for (const port of ["", "0", "65536", "3.5", "NaN"]) {
      expect(() => readConfig({ ...valid, PORT: port })).toThrow("PORT");
    }
    for (const origin of [
      "*",
      "not-a-url",
      "https://example.com/path",
      "https://example.com/",
      "ftp://example.com",
      "https://user:password@example.com",
    ]) {
      expect(() => readConfig({ ...valid, FRONTEND_ORIGIN: origin })).toThrow(
        "FRONTEND_ORIGIN",
      );
    }
    expect(
      readConfig({
        ...valid,
        PORT: "8080",
        FRONTEND_ORIGIN: "https://app.example.com",
      }),
    ).toMatchObject({
      port: 8080,
      frontendOrigin: "https://app.example.com",
    });
  });
});
