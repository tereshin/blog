import { uuidV7 } from '../profile/uuid-v7';
import { BlockError } from './block-error';
import type { BlockRecord, BlockStore, StaffAudit } from './block-store';

const refused_while_blocked = [
  'publish',
  'comment',
  'follow',
  'like',
  'bookmark',
  'direct_message',
] as const;

const allowed_while_blocked = [
  'read',
  'edit_own_article',
  'soft_remove_own_article',
  'file_complaint',
] as const;

export type ParticipationAction =
  | (typeof refused_while_blocked)[number]
  | (typeof allowed_while_blocked)[number];

export type AuditPage = {
  items: StaffAudit[];
  has_next: boolean;
  has_prev: boolean;
  next_cursor: string | null;
};

export class BlockService {
  now: () => Date = () => new Date();

  constructor(private readonly store: BlockStore) {}

  async isBlocked(user_id: string): Promise<boolean> {
    const active = await this.store.findActiveBlock(user_id);
    return active !== null;
  }

  async decide(
    user_id: string,
    action: ParticipationAction,
  ): Promise<'allowed' | 'ACCOUNT_BLOCKED'> {
    if (allowed_while_blocked.includes(action as (typeof allowed_while_blocked)[number])) {
      return 'allowed';
    }
    const refused = refused_while_blocked.includes(action as (typeof refused_while_blocked)[number]);
    if (refused && (await this.isBlocked(user_id))) {
      return 'ACCOUNT_BLOCKED';
    }
    return 'allowed';
  }

  async block(input: {
    actor_firebase_uid: string;
    user_id: string;
    reason: string;
  }): Promise<BlockRecord> {
    const actor = await this.requireStaff(input.actor_firebase_uid);
    const reason = input.reason.trim();
    if (reason.length === 0) {
      throw new BlockError('REASON_REQUIRED');
    }
    const target = await this.requireUser(input.user_id);
    if (target.role !== 'user') {
      throw new BlockError('STAFF_FORBIDDEN');
    }
    const existing = await this.store.findActiveBlock(target.id);
    if (existing) {
      return existing;
    }

    const created_at = this.now().toISOString();
    const block: BlockRecord = {
      id: uuidV7(this.now().getTime()),
      user_id: target.id,
      actor_id: actor.id,
      reason,
      created_at,
      lifted_at: null,
      lifted_by: null,
    };
    await this.store.insertBlock(block, {
      id: uuidV7(this.now().getTime()),
      actor_id: actor.id,
      action: 'user.block',
      entity_type: 'user',
      entity_id: target.id,
      reason,
      before_state: null,
      after_state: { blocked: true },
      request_id: null,
      created_at,
    });
    return block;
  }

  async unblock(input: {
    actor_firebase_uid: string;
    user_id: string;
  }): Promise<BlockRecord> {
    const actor = await this.requireStaff(input.actor_firebase_uid);
    const active = await this.store.findActiveBlock(input.user_id);
    if (!active) {
      throw new BlockError('BLOCK_NOT_FOUND');
    }
    const lifted_at = this.now().toISOString();
    const lifted: BlockRecord = {
      ...active,
      lifted_at,
      lifted_by: actor.id,
    };
    await this.store.liftBlock(lifted, {
      id: uuidV7(this.now().getTime()),
      actor_id: actor.id,
      action: 'user.unblock',
      entity_type: 'user',
      entity_id: active.user_id,
      reason: null,
      before_state: { blocked: true },
      after_state: { blocked: false },
      request_id: null,
      created_at: lifted_at,
    });
    return lifted;
  }

  async listAudit(input: {
    actor_firebase_uid: string;
    after: string | null;
    limit: number;
  }): Promise<AuditPage> {
    const actor = await this.requireStaff(input.actor_firebase_uid);
    const actor_filter = actor.role === 'administrator' ? null : actor.id;
    const visible = await this.store.listAudits(actor_filter);
    const start =
      input.after === null ? 0 : Math.max(visible.findIndex((entry) => entry.id === input.after) + 1, 0);
    const items = visible.slice(start, start + input.limit);
    const has_next = start + input.limit < visible.length;
    const last = items[items.length - 1];
    return {
      items,
      has_next,
      has_prev: input.after !== null && start > 0,
      next_cursor: has_next && last ? last.id : null,
    };
  }

  private async requireStaff(firebase_uid: string) {
    const actor = await this.store.findByFirebaseUid(firebase_uid);
    if (!actor || (actor.role !== 'moderator' && actor.role !== 'administrator')) {
      throw new BlockError('STAFF_FORBIDDEN');
    }
    return actor;
  }

  private async requireUser(user_id: string) {
    const target = await this.store.findById(user_id);
    if (!target) {
      throw new BlockError('USER_NOT_FOUND');
    }
    return target;
  }
}
