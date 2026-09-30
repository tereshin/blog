import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';

const package_root = process.cwd();
const staged_dir = join(
  package_root,
  '../../docs/features/blog-platform/migrations',
);

type Journal = {
  entries: Array<{
    idx: number;
    version: string;
    tag: string;
    breakpoints: boolean;
  }>;
};

export function expectPromotedMigration(input: {
  live_tag: string;
  staged_up: string;
  staged_down: string;
  previous_tag: string;
  idx: number;
  schema_name: string;
}): void {
  const up_path = join(package_root, 'migrations', `${input.live_tag}.sql`);
  const down_path = join(
    package_root,
    'migrations',
    `${input.live_tag}.down.sql`,
  );

  expect(existsSync(up_path)).toBe(true);
  expect(existsSync(down_path)).toBe(true);
  expect(readFileSync(up_path, 'utf8')).toBe(
    readFileSync(join(staged_dir, input.staged_up), 'utf8'),
  );
  expect(readFileSync(down_path, 'utf8')).toBe(
    readFileSync(join(staged_dir, input.staged_down), 'utf8'),
  );

  const journal = JSON.parse(
    readFileSync(join(package_root, 'migrations/meta/_journal.json'), 'utf8'),
  ) as Journal;
  const entry = journal.entries[input.idx];

  expect(journal.entries[input.idx - 1]?.tag).toBe(input.previous_tag);
  expect(entry).toMatchObject({
    idx: input.idx,
    version: '7',
    tag: input.live_tag,
    breakpoints: true,
  });

  const referenced_schemas = [
    ...readFileSync(up_path, 'utf8').matchAll(
      /REFERENCES\s+([a-z_][a-z0-9_]*)\./gi,
    ),
  ].map((match) => match[1]);

  expect(referenced_schemas.length).toBeGreaterThan(0);
  expect(referenced_schemas.every((schema) => schema === input.schema_name)).toBe(
    true,
  );
}
