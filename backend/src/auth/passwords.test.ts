import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyMissingUserPassword,
  verifyPassword,
} from "./passwords.js";

describe("password hashing", () => {
  it("uses independent salts and verifies only the original password", async () => {
    const password = "correct horse battery staple";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);
    expect(firstHash).toMatch(/^\$argon2id\$v=19\$/);
    expect(firstHash.split("$")[3]?.split(",").sort()).toEqual([
      "m=19456",
      "p=1",
      "t=2",
    ]);
    expect(secondHash).not.toBe(firstHash);
    expect(await verifyPassword(firstHash, password)).toBe(true);
    expect(await verifyPassword(secondHash, password)).toBe(true);
    expect(await verifyPassword(firstHash, `${password}!`)).toBe(false);
  });

  it("preserves Unicode and whitespace without truncating long passwords", async () => {
    const password = ` ${"🔐".repeat(126)} `;
    const passwordHash = await hashPassword(password);
    expect(await verifyPassword(passwordHash, password)).toBe(true);
    expect(await verifyPassword(passwordHash, password.trim())).toBe(false);
    expect(
      await verifyPassword(passwordHash, `${password.slice(0, -1)}!`),
    ).toBe(false);
  });

  it("does not silently normalize Unicode passwords", async () => {
    const password = "caf\u00e9 password";
    const passwordHash = await hashPassword(password);
    expect(await verifyPassword(passwordHash, password)).toBe(true);
    expect(await verifyPassword(passwordHash, password.normalize("NFD"))).toBe(
      false,
    );
  });

  it("fails closed for malformed stored hashes", async () => {
    expect(await verifyPassword("not-an-argon2-hash", "password123")).toBe(
      false,
    );
  });

  it("always rejects missing users while performing password verification", async () => {
    expect(await verifyMissingUserPassword("password123")).toBe(false);
    expect(await verifyMissingUserPassword("another-password")).toBe(false);
  });
});
