import { and, desc, eq, isNull } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { admin_audit_log, blocks, users_table } from '../profile/users-schema';
import type { RoleName } from '../role/role-store';
import type { AuditAction, BlockRecord, BlockStore, BlockUser, StaffAudit } from './block-store';

function toUser(row: { id: string; firebase_uid: string; role: string }): BlockUser | null {
  if (row.role !== 'user' && row.role !== 'moderator' && row.role !== 'administrator') {
    return null;
  }
  return { id: row.id, firebase_uid: row.firebase_uid, role: row.role as RoleName };
}

export class DrizzleBlockStore implements BlockStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async findByFirebaseUid(firebase_uid: string): Promise<BlockUser | null> {
    const rows = await this.db
      .select({
        id: users_table.id,
        firebase_uid: users_table.firebase_uid,
        role: users_table.role,
      })
      .from(users_table)
      .where(eq(users_table.firebase_uid, firebase_uid))
      .limit(1);
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async findById(user_id: string): Promise<BlockUser | null> {
    const rows = await this.db
      .select({
        id: users_table.id,
        firebase_uid: users_table.firebase_uid,
        role: users_table.role,
      })
      .from(users_table)
      .where(eq(users_table.id, user_id))
      .limit(1);
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async findActiveBlock(user_id: string): Promise<BlockRecord | null> {
    const rows = await this.db
      .select()
      .from(blocks)
      .where(and(eq(blocks.user_id, user_id), isNull(blocks.lifted_at)))
      .limit(1);
    const row = rows[0];
    return row ? { ...row, lifted_at: row.lifted_at, lifted_by: row.lifted_by } : null;
  }

  async insertBlock(block: BlockRecord, audit: StaffAudit): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(blocks).values(block);
      await tx.insert(admin_audit_log).values(audit);
    });
  }

  async liftBlock(block: BlockRecord, audit: StaffAudit): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(blocks)
        .set({ lifted_at: block.lifted_at, lifted_by: block.lifted_by })
        .where(eq(blocks.id, block.id));
      await tx.insert(admin_audit_log).values(audit);
    });
  }

  async listAudits(actor_id: string | null): Promise<StaffAudit[]> {
    const query = this.db
      .select()
      .from(admin_audit_log)
      .orderBy(desc(admin_audit_log.created_at), desc(admin_audit_log.id));
    const rows = actor_id
      ? await query.where(eq(admin_audit_log.actor_id, actor_id))
      : await query;
    return rows.map((row) => ({
      id: row.id,
      actor_id: row.actor_id,
      action: row.action as AuditAction,
      entity_type: row.entity_type as StaffAudit['entity_type'],
      entity_id: row.entity_id,
      reason: row.reason,
      before_state: (row.before_state as Record<string, unknown> | null) ?? null,
      after_state: (row.after_state as Record<string, unknown> | null) ?? null,
      request_id: row.request_id,
      created_at: row.created_at,
    }));
  }
}
