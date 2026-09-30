import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const package_root = process.cwd();
const repo_root = join(package_root, '../..');
const staged_dir = join(repo_root, 'docs/features/blog-platform/migrations');
const live_tag = '0001_create_users';

describe('promote users schema', () => {
  it('copies the staged SQL verbatim into the next migration tag', () => {
    const up_path = join(package_root, 'migrations', `${live_tag}.sql`);
    const down_path = join(package_root, 'migrations', `${live_tag}.down.sql`);

    expect(existsSync(up_path)).toBe(true);
    expect(existsSync(down_path)).toBe(true);
    expect(readFileSync(up_path, 'utf8')).toBe(
      readFileSync(join(staged_dir, '01_create_users.up.sql'), 'utf8'),
    );
    expect(readFileSync(down_path, 'utf8')).toBe(
      readFileSync(join(staged_dir, '01_create_users.down.sql'), 'utf8'),
    );
  });

  it('appends the journal row after the baseline only', () => {
    const journal = JSON.parse(
      readFileSync(join(package_root, 'migrations/meta/_journal.json'), 'utf8'),
    ) as {
      entries: Array<{
        idx: number;
        version: string;
        tag: string;
        breakpoints: boolean;
      }>;
    };

    expect(journal.entries.map((entry) => entry.tag)).toEqual([
      '0000_baseline',
      live_tag,
    ]);
    expect(journal.entries[1]).toMatchObject({
      idx: 1,
      version: '7',
      tag: live_tag,
      breakpoints: true,
    });
  });

  it('keeps foreign keys inside the users schema', () => {
    const up_sql = readFileSync(
      join(package_root, 'migrations', `${live_tag}.sql`),
      'utf8',
    );
    const referenced_schemas = [
      ...up_sql.matchAll(/REFERENCES\s+([a-z_][a-z0-9_]*)\./gi),
    ].map((match) => match[1]);

    expect(referenced_schemas.length).toBeGreaterThan(0);
    expect(referenced_schemas.every((schema) => schema === 'users')).toBe(
      true,
    );
  });
});
