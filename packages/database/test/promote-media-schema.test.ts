import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote media schema', () => {
  it('copies the staged SQL after the content migration and adds no foreign key', () => {
    expectPromotedMigration({
      live_tag: '0004_create_media',
      staged_up: '04_create_media.up.sql',
      staged_down: '04_create_media.down.sql',
      previous_tag: '0003_create_content',
      idx: 4,
      schema_name: 'media',
      expects_foreign_keys: false,
    });
  });
});
