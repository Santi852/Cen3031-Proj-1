import { randomBytes } from "node:crypto";
import { argon2id, hash, verify } from "argon2";

let missingUserHash: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function verifyMissingUserPassword(
  password: string,
): Promise<boolean> {
  missingUserHash ??= hashPassword(randomBytes(32).toString("hex"));
  await verifyPassword(await missingUserHash, password);
  return false;
}
