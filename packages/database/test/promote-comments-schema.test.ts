import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote comments schema', () => {
  it('copies the staged SQL after the media migration and keeps foreign keys in comments', () => {
    expectPromotedMigration({
      live_tag: '0005_create_comments',
      staged_up: '05_create_comments.up.sql',
      staged_down: '05_create_comments.down.sql',
      previous_tag: '0004_create_media',
      idx: 5,
      schema_name: 'comments',
    });
  });
});
