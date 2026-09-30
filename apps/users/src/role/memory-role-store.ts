import type { AuditEntry, RoleName, RoleRecord, RoleStore } from './role-store';

export class MemoryRoleStore implements RoleStore {
  readonly users: RoleRecord[] = [];
  readonly audits: AuditEntry[] = [];

  async findByFirebaseUid(firebase_uid: string): Promise<RoleRecord | null> {
    return this.users.find((user) => user.firebase_uid === firebase_uid) ?? null;
  }

  async findById(user_id: string): Promise<RoleRecord | null> {
    return this.users.find((user) => user.id === user_id) ?? null;
  }

  async countAdministrators(): Promise<number> {
    return this.users.filter((user) => user.role === 'administrator').length;
  }

  async assignRole(user_id: string, role: RoleName, audit: AuditEntry): Promise<void> {
    const user = this.users.find((row) => row.id === user_id);
    if (!user) {
      return;
    }
    user.role = role;
    this.audits.push(audit);
  }
}
