import { count, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { admin_audit_log, users_table } from '../profile/users-schema';
import type { AuditEntry, RoleName, RoleRecord, RoleStore } from './role-store';

function toRecord(row: {
  id: string;
  firebase_uid: string;
  role: string;
}): RoleRecord | null {
  if (row.role !== 'user' && row.role !== 'moderator' && row.role !== 'administrator') {
    return null;
  }
  return { id: row.id, firebase_uid: row.firebase_uid, role: row.role };
}

export class DrizzleRoleStore implements RoleStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async findByFirebaseUid(firebase_uid: string): Promise<RoleRecord | null> {
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
    return row ? toRecord(row) : null;
  }

  async findById(user_id: string): Promise<RoleRecord | null> {
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
    return row ? toRecord(row) : null;
  }

  async countAdministrators(): Promise<number> {
    const rows = await this.db
      .select({ total: count() })
      .from(users_table)
      .where(eq(users_table.role, 'administrator'));
    return Number(rows[0]?.total ?? 0);
  }

  async assignRole(user_id: string, role: RoleName, audit: AuditEntry): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(users_table)
        .set({ role, updated_at: new Date().toISOString() })
        .where(eq(users_table.id, user_id));
      await tx.insert(admin_audit_log).values({
        id: audit.id,
        actor_id: audit.actor_id,
        action: audit.action,
        entity_type: audit.entity_type,
        entity_id: audit.entity_id,
        reason: audit.reason,
        before_state: audit.before_state,
        after_state: audit.after_state,
      });
    });
  }
}
