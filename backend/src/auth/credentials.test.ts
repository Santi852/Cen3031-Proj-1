import { describe, expect, it } from "vitest";
import { parseCredentials } from "./credentials.js";

const email = "matias@example.com";
const password = "password123";

describe("authentication credentials", () => {
  it("normalizes email and preserves the exact password", () => {
    const originalPassword = "  caf\u0065\u0301 password 🔐  ";
    expect(
      parseCredentials({
        email: "  Matias@EXAMPLE.com \n",
        password: originalPassword,
      }),
    ).toEqual({ email, password: originalPassword });
  });

  it("rejects absent fields, non-string fields and non-object bodies", () => {
    for (const body of [
      null,
      undefined,
      [],
      "credentials",
      12,
      {},
      { email },
      { password },
      { email: 42, password },
      { email, password: [password] },
    ]) {
      expect(parseCredentials(body)).toBeNull();
    }
  });

  it("rejects malformed emails", () => {
    for (const invalidEmail of [
      "",
      "no-domain",
      "@example.com",
      "matias@",
      "matias@example",
      "a b@example.com",
      "a@@example.com",
      "a\u0000@example.com",
      "a\n@example.com",
    ]) {
      expect(parseCredentials({ email: invalidEmail, password })).toBeNull();
    }
  });

  it("accepts a 254-character email and rejects a longer address", () => {
    const boundaryEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(59)}.e`;
    expect(boundaryEmail).toHaveLength(254);
    expect(parseCredentials({ email: boundaryEmail, password })).not.toBeNull();
    expect(
      parseCredentials({ email: `${boundaryEmail}e`, password }),
    ).toBeNull();
  });

  it("accepts password boundaries and rejects passwords outside them", () => {
    for (const length of [8, 128]) {
      expect(
        parseCredentials({ email, password: "x".repeat(length) }),
      ).not.toBeNull();
    }
    for (const length of [0, 7, 129]) {
      expect(
        parseCredentials({ email, password: "x".repeat(length) }),
      ).toBeNull();
    }
  });

  it("counts Unicode code points rather than UTF-16 units", () => {
    expect(parseCredentials({ email, password: "🔐".repeat(7) })).toBeNull();
    expect(
      parseCredentials({ email, password: "🔐".repeat(8) }),
    ).not.toBeNull();
    expect(
      parseCredentials({ email, password: "🔐".repeat(128) }),
    ).not.toBeNull();
    expect(parseCredentials({ email, password: "🔐".repeat(129) })).toBeNull();
  });
});
