import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote messages schema', () => {
  it('copies the staged SQL after the social migration and keeps foreign keys in messages', () => {
    expectPromotedMigration({
      live_tag: '0008_create_messages',
      staged_up: '08_create_messages.up.sql',
      staged_down: '08_create_messages.down.sql',
      previous_tag: '0007_create_social',
      idx: 8,
      schema_name: 'messages',
    });
  });
});
