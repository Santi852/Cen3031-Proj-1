const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function parseCredentials(
  body: unknown,
): { email: string; password: string } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return null;
  if (!("email" in body) || !("password" in body)) return null;
  if (typeof body.email !== "string" || typeof body.password !== "string")
    return null;

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  const passwordLength = [...password].length;
  const hasControlCharacter = [...email].some((character) => {
    const code = character.codePointAt(0)!;
    return code < 32 || code === 127;
  });

  if (email.length > 254 || !emailPattern.test(email) || hasControlCharacter)
    return null;
  if (passwordLength < 8 || passwordLength > 128) return null;
  return { email, password };
}
