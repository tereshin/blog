import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote content schema', () => {
  it('copies the staged SQL after the categories migration and keeps foreign keys in content', () => {
    expectPromotedMigration({
      live_tag: '0003_create_content',
      staged_up: '03_create_content.up.sql',
      staged_down: '03_create_content.down.sql',
      previous_tag: '0002_create_categories',
      idx: 3,
      schema_name: 'content',
    });
  });
});
