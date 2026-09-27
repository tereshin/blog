import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export function createDatabase(connectionString: string): NodePgDatabase {
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool });
}

export type Database = ReturnType<typeof createDatabase>;
