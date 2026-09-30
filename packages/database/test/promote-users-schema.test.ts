import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote users schema', () => {
  it('copies the staged SQL after the baseline and keeps foreign keys in users', () => {
    expectPromotedMigration({
      live_tag: '0001_create_users',
      staged_up: '01_create_users.up.sql',
      staged_down: '01_create_users.down.sql',
      previous_tag: '0000_baseline',
      idx: 1,
      schema_name: 'users',
    });
  });
});
