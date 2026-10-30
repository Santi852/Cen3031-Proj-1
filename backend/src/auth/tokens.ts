import { jwtVerify, SignJWT } from "jose";

export const TOKEN_TTL_SECONDS = 3_600;

const issuer = "stacksprint";
const audience = "stacksprint-api";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const placeholderPattern =
  /^(?:replace[-_ ]?with|change[-_ ]?me|your[-_ ](?:jwt[-_ ]?)?secret|example[-_ ]|placeholder)/i;

export function createTokenService(secret: string) {
  const key = new TextEncoder().encode(secret);
  if (
    key.byteLength < 32 ||
    !secret.trim() ||
    placeholderPattern.test(secret.trim())
  ) {
    throw new Error(
      "JWT_SECRET must contain at least 32 UTF-8 bytes and cannot be an example placeholder.",
    );
  }

  return {
    async issue(userId: string): Promise<string> {
      if (!uuidPattern.test(userId))
        throw new Error("Token subject must be a UUID.");
      const issuedAt = Math.floor(Date.now() / 1_000);
      return new SignJWT({})
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(issuer)
        .setAudience(audience)
        .setSubject(userId)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
        .sign(key);
    },

    async verify(token: string): Promise<string> {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["HS256"],
        issuer,
        audience,
        requiredClaims: ["exp", "iat", "sub"],
        maxTokenAge: TOKEN_TTL_SECONDS,
      });
      if (!payload.sub || !uuidPattern.test(payload.sub)) {
        throw new Error("Token subject must be a UUID.");
      }
      return payload.sub;
    },
  };
}
