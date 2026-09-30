import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote categories schema', () => {
  it('copies the staged SQL after the users migration and keeps foreign keys in categories', () => {
    expectPromotedMigration({
      live_tag: '0002_create_categories',
      staged_up: '02_create_categories.up.sql',
      staged_down: '02_create_categories.down.sql',
      previous_tag: '0001_create_users',
      idx: 2,
      schema_name: 'categories',
    });
  });
});
