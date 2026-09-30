import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote engagement schema', () => {
  it('copies the staged SQL after the comments migration and adds no foreign key', () => {
    expectPromotedMigration({
      live_tag: '0006_create_engagement',
      staged_up: '06_create_engagement.up.sql',
      staged_down: '06_create_engagement.down.sql',
      previous_tag: '0005_create_comments',
      idx: 6,
      schema_name: 'engagement',
      expects_foreign_keys: false,
    });
  });
});
