import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

const live_tag = '0011_seed_rate_limits';

describe('promote rate-limit seed', () => {
  it('copies the staged SQL after the feed migration and writes only users.rate_limit_settings', () => {
    expectPromotedMigration({
      live_tag,
      staged_up: '11_seed_rate_limits.up.sql',
      staged_down: '11_seed_rate_limits.down.sql',
      previous_tag: '0010_create_feed',
      idx: 11,
      schema_name: '',
      expects_foreign_keys: false,
    });

    const up_sql = readFileSync(
      join(process.cwd(), 'migrations', `${live_tag}.sql`),
      'utf8',
    );

    expect(up_sql).toContain('INSERT INTO users.rate_limit_settings');
    expect(up_sql).not.toMatch(/CREATE SCHEMA/i);
  });
});
