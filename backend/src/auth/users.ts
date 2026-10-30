import type { Pool } from "pg";

export type User = { id: string; email: string };
type UserWithPassword = User & { password_hash: string };

export function createUserStore(database: Pick<Pool, "query">) {
  return {
    async create(email: string, passwordHash: string): Promise<User> {
      const result = await database.query<User>(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
        [email, passwordHash],
      );
      return result.rows[0]!;
    },
    async findByEmail(email: string): Promise<UserWithPassword | undefined> {
      const result = await database.query<UserWithPassword>(
        "SELECT id, email, password_hash FROM users WHERE lower(email) = $1",
        [email],
      );
      return result.rows[0];
    },
    async findById(id: string): Promise<User | undefined> {
      const result = await database.query<User>(
        "SELECT id, email FROM users WHERE id = $1",
        [id],
      );
      return result.rows[0];
    },
  };
}
