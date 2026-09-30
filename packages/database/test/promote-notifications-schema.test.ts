import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote notifications schema', () => {
  it('copies the staged SQL after the messages migration and adds no foreign key', () => {
    expectPromotedMigration({
      live_tag: '0009_create_notifications',
      staged_up: '09_create_notifications.up.sql',
      staged_down: '09_create_notifications.down.sql',
      previous_tag: '0008_create_messages',
      idx: 9,
      schema_name: 'notifications',
      expects_foreign_keys: false,
    });
  });
});
