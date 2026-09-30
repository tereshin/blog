import { describe, it } from 'vitest';
import { expectPromotedMigration } from './expect-promoted-migration';

describe('promote social schema', () => {
  it('copies the staged SQL after the engagement migration and adds no foreign key', () => {
    expectPromotedMigration({
      live_tag: '0007_create_social',
      staged_up: '07_create_social.up.sql',
      staged_down: '07_create_social.down.sql',
      previous_tag: '0006_create_engagement',
      idx: 7,
      schema_name: 'social',
      expects_foreign_keys: false,
    });
  });
});
