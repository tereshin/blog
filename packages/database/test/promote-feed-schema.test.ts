import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote feed schema', () => {
  it('copies the staged SQL after the notifications migration and adds no foreign key', () => {
    expectPromotedMigration({
      live_tag: '0010_create_feed',
      staged_up: '10_create_feed.up.sql',
      staged_down: '10_create_feed.down.sql',
      previous_tag: '0009_create_notifications',
      idx: 10,
      schema_name: 'feed',
      expects_foreign_keys: false,
    });
  });
});
