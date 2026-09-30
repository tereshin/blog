import { describe, expect, it } from 'vitest';
import { BlockService } from '../src/block/block-service';
import { MemoryBlockStore } from '../src/block/memory-block-store';
import type { StaffAudit } from '../src/block/block-store';

const moderator_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';
const admin_id = '018f3c2a-7b10-7c3e-8f21-000000000001';
const user_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';

const refused = ['publish', 'comment', 'follow', 'like', 'bookmark', 'direct_message'] as const;
const allowed = ['read', 'edit_own_article', 'soft_remove_own_article', 'file_complaint'] as const;

function staffStore(): MemoryBlockStore {
  const store = new MemoryBlockStore();
  store.users.push(
    { id: moderator_id, firebase_uid: 'moderator', role: 'moderator' },
    { id: admin_id, firebase_uid: 'seed-admin', role: 'administrator' },
    { id: user_id, firebase_uid: 'member', role: 'user' },
  );
  return store;
}

describe('block and audit', () => {
  it('blocks a user, refuses new writes, and allows them again after the lift', async () => {
    const store = staffStore();
    const blocks = new BlockService(store);
    blocks.now = () => new Date('2026-09-30T13:00:00.000Z');

    const block = await blocks.block({
      actor_firebase_uid: 'moderator',
      user_id,
      reason: 'Spam',
    });
    expect(block.lifted_at).toBeNull();
    expect(await blocks.isBlocked(user_id)).toBe(true);

    for (const action of refused) {
      expect(await blocks.decide(user_id, action)).toBe('ACCOUNT_BLOCKED');
    }
    for (const action of allowed) {
      expect(await blocks.decide(user_id, action)).toBe('allowed');
    }

    const lifted = await blocks.unblock({
      actor_firebase_uid: 'moderator',
      user_id,
    });
    expect(lifted.lifted_at).toBe('2026-09-30T13:00:00.000Z');
    expect(lifted.lifted_by).toBe(moderator_id);
    expect(await blocks.isBlocked(user_id)).toBe(false);
    for (const action of refused) {
      expect(await blocks.decide(user_id, action)).toBe('allowed');
    }
    expect(store.audits.map((entry) => entry.action)).toEqual(['user.block', 'user.unblock']);
    expect(store.audits[0]?.reason).toBe('Spam');
    expect(store.content_writes).toEqual([]);
    expect(block).not.toHaveProperty('article_status');
  });

  it('does not insert a block when the reason is blank', async () => {
    const store = staffStore();
    const blocks = new BlockService(store);

    await expect(
      blocks.block({ actor_firebase_uid: 'moderator', user_id, reason: '  ' }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    expect(store.blocks).toHaveLength(0);
    expect(store.audits).toHaveLength(0);
  });

  it('shows every staff action to an administrator and only own actions to a moderator', async () => {
    const store = staffStore();
    const rows: StaffAudit[] = [
      audit('a1', admin_id, 'article.hide', '2026-09-30T12:00:00.000Z'),
      audit('a2', moderator_id, 'user.block', '2026-09-30T12:01:00.000Z'),
      audit('a3', admin_id, 'user.role.change', '2026-09-30T12:02:00.000Z'),
      audit('a4', moderator_id, 'article.soft_remove', '2026-09-30T12:03:00.000Z'),
      audit('a5', admin_id, 'complaint.dismiss', '2026-09-30T12:04:00.000Z'),
      audit('a6', admin_id, 'article.category.change', '2026-09-30T12:05:00.000Z'),
    ];
    store.audits.push(...rows);
    const blocks = new BlockService(store);

    const admin_page = await blocks.listAudit({
      actor_firebase_uid: 'seed-admin',
      after: null,
      limit: 20,
    });
    expect(admin_page.items.map((entry) => entry.id)).toEqual([
      'a6',
      'a5',
      'a4',
      'a3',
      'a2',
      'a1',
    ]);
    expect(admin_page.items.every((entry) => entry.reason === 'Test reason')).toBe(true);

    const own_page = await blocks.listAudit({
      actor_firebase_uid: 'moderator',
      after: null,
      limit: 1,
    });
    expect(own_page.items.map((entry) => entry.actor_id)).toEqual([moderator_id]);
    expect(own_page.has_next).toBe(true);
    expect(own_page.next_cursor).toBe('a4');

    const next_page = await blocks.listAudit({
      actor_firebase_uid: 'moderator',
      after: own_page.next_cursor,
      limit: 1,
    });
    expect(next_page.items.map((entry) => entry.id)).toEqual(['a2']);
    expect(next_page.has_prev).toBe(true);
    expect(store.audits).toHaveLength(rows.length);
  });

  it('returns BLOCK_NOT_FOUND when there is no active block to lift', async () => {
    const store = staffStore();
    const blocks = new BlockService(store);

    await expect(
      blocks.unblock({ actor_firebase_uid: 'moderator', user_id }),
    ).rejects.toMatchObject({ code: 'BLOCK_NOT_FOUND' });
  });
});

function audit(
  id: string,
  actor_id: string,
  action: StaffAudit['action'],
  created_at: string,
): StaffAudit {
  return {
    id,
    actor_id,
    action,
    entity_type: 'user',
    entity_id: user_id,
    reason: 'Test reason',
    before_state: null,
    after_state: null,
    request_id: null,
    created_at,
  };
}
