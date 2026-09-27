import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

type Journal = {
  entries: Array<{
    tag: string;
  }>;
};

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://blog:blog@127.0.0.1:5432/blog';
const migrationsFolder = join(process.cwd(), 'migrations');

async function rollbackLastMigration(): Promise<void> {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8'),
  ) as Journal;
  const last = journal.entries.at(-1);

  if (!last) {
    throw new Error('No migrations to roll back');
  }

  const upSql = readFileSync(join(migrationsFolder, `${last.tag}.sql`), 'utf8');
  const downSql = readFileSync(
    join(migrationsFolder, `${last.tag}.down.sql`),
    'utf8',
  );
  const hash = createHash('sha256').update(upSql).digest('hex');
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(downSql);
    const deleted = await client.query(
      'DELETE FROM drizzle.__drizzle_migrations WHERE hash = $1',
      [hash],
    );

    if (deleted.rowCount !== 1) {
      throw new Error(
        `Expected to delete 1 migration row for ${last.tag}, deleted ${String(deleted.rowCount)}`,
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

rollbackLastMigration().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
