// src/lib/db.ts
import { Pool, PoolClient, QueryResult } from "pg";
import { config } from "../lib/config";

// ONE pool for the entire Next.js process.
// In development, Next.js hot-reloads modules — use a global to prevent
// creating a new pool on every file save.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    max: config.db.maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (err) => {
    // Log but don't crash — the pool will reconnect
    console.error("[DB] Unexpected pool error:", err.message);
  });

  return pool;
}

if (!global.__pgPool) {
  global.__pgPool = createPool();
}

export const pool: Pool = global.__pgPool;

// Typed query helper — never returns raw error messages
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

// Transaction helper
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}