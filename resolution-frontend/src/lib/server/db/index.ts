import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "$env/dynamic/private";
import * as schema from "./schema";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  idleTimeoutMillis: 0,
  keepAlive: true,
  max: 5,
});

pool
  .query("SELECT 1")
  .catch((err) => console.error("[db] prewarm failed", err));

export const db = drizzle(pool, { schema });
