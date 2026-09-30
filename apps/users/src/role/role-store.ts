export const role_names = ['user', 'moderator', 'administrator'] as const;

export type RoleName = (typeof role_names)[number];

export type RoleRecord = {
  id: string;
  firebase_uid: string;
  role: RoleName;
};

export type AuditEntry = {
  id: string;
  actor_id: string;
  action: 'user.role.change';
  entity_type: 'user';
  entity_id: string;
  reason: string;
  before_state: { role: RoleName };
  after_state: { role: RoleName };
};

export interface RoleStore {
  findByFirebaseUid(firebase_uid: string): Promise<RoleRecord | null>;
  findById(user_id: string): Promise<RoleRecord | null>;
  countAdministrators(): Promise<number>;
  assignRole(user_id: string, role: RoleName, audit: AuditEntry): Promise<void>;
}
