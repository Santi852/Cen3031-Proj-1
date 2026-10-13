import { randomBytes, randomUUID } from "node:crypto";
import { decodeJwt, decodeProtectedHeader, SignJWT } from "jose";
import type { JWTPayload } from "jose";
import { describe, expect, it } from "vitest";
import { createTokenService, TOKEN_TTL_SECONDS } from "./tokens.js";

const secret = randomBytes(32).toString("hex");
const key = new TextEncoder().encode(secret);
const service = createTokenService(secret);
const userId = randomUUID();

function validClaims(): JWTPayload {
  const now = Math.floor(Date.now() / 1_000);
  return {
    sub: userId,
    iss: "stacksprint",
    aud: "stacksprint-api",
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
}

function sign(claims: JWTPayload, algorithm = "HS256") {
  return new SignJWT(claims).setProtectedHeader({ alg: algorithm }).sign(key);
}

describe("authentication tokens", () => {
  it("issues a one-hour HS256 token containing only identity and standard claims", async () => {
    const token = await service.issue(userId);
    const claims = decodeJwt(token);
    expect(await service.verify(token)).toBe(userId);
    expect(decodeProtectedHeader(token)).toEqual({ alg: "HS256", typ: "JWT" });
    expect(claims.exp! - claims.iat!).toBe(TOKEN_TTL_SECONDS);
    expect(Object.keys(claims).sort()).toEqual([
      "aud",
      "exp",
      "iat",
      "iss",
      "sub",
    ]);
  });

  it("requires a sufficiently long secret and rejects example placeholders", () => {
    for (const invalid of [
      "short",
      " ".repeat(32),
      "replace-with-a-long-random-string",
      "replace-with-at-least-32-random-bytes",
      "your-jwt-secret-that-must-be-replaced",
    ]) {
      expect(() => createTokenService(invalid)).toThrow(/JWT_SECRET/);
    }
    expect(() => createTokenService("🔑".repeat(8))).not.toThrow();
    expect(() => createTokenService("🔑".repeat(7))).toThrow(/JWT_SECRET/);
  });

  it("rejects tampering and tokens signed with another secret", async () => {
    const token = await service.issue(userId);
    const [header, payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...decodeJwt(token), sub: randomUUID() }),
    ).toString("base64url");
    expect(payload).not.toBe(tamperedPayload);
    await expect(
      service.verify(`${header}.${tamperedPayload}.${signature}`),
    ).rejects.toThrow();
    const otherService = createTokenService(randomBytes(32).toString("hex"));
    await expect(
      service.verify(await otherService.issue(userId)),
    ).rejects.toThrow();
  });

  it("rejects expired tokens and tokens older than one hour despite a future expiry", async () => {
    const now = Math.floor(Date.now() / 1_000);
    await expect(
      service.verify(await sign({ ...validClaims(), exp: now - 1 })),
    ).rejects.toThrow();
    await expect(
      service.verify(
        await sign({ ...validClaims(), iat: now - TOKEN_TTL_SECONDS - 1 }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a future issue time", async () => {
    await expect(
      service.verify(
        await sign({
          ...validClaims(),
          iat: Math.floor(Date.now() / 1_000) + 60,
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects tokens intended for another issuer or audience", async () => {
    await expect(
      service.verify(await sign({ ...validClaims(), iss: "another-service" })),
    ).rejects.toThrow();
    await expect(
      service.verify(await sign({ ...validClaims(), aud: "another-api" })),
    ).rejects.toThrow();
  });

  it("rejects other signing algorithms even with a valid shared secret", async () => {
    await expect(
      service.verify(await sign(validClaims(), "HS384")),
    ).rejects.toThrow();
    const unsecured = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify(validClaims())).toString("base64url")}.`;
    await expect(service.verify(unsecured)).rejects.toThrow();
  });

  it("requires every authentication claim", async () => {
    for (const claim of ["exp", "iat", "sub", "iss", "aud"]) {
      const claims = validClaims();
      delete claims[claim];
      await expect(service.verify(await sign(claims))).rejects.toThrow();
    }
  });

  it("rejects invalid UUID subjects on issuance and verification", async () => {
    for (const subject of [
      "",
      "user-1",
      "00000000-0000-0000-0000-000000000000",
    ]) {
      await expect(service.issue(subject)).rejects.toThrow(/UUID/);
      await expect(
        service.verify(await sign({ ...validClaims(), sub: subject })),
      ).rejects.toThrow();
    }
  });
});
