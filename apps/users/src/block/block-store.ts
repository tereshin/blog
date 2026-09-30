import type { RoleName } from '../role/role-store';

export const audit_actions = [
  'article.hide',
  'comment.hide',
  'user.block',
  'user.unblock',
  'user.role.change',
  'article.soft_remove',
  'article.category.change',
  'category.create',
  'complaint.dismiss',
] as const;

export type AuditAction = (typeof audit_actions)[number];

export type BlockUser = {
  id: string;
  firebase_uid: string;
  role: RoleName;
};

export type BlockRecord = {
  id: string;
  user_id: string;
  actor_id: string;
  reason: string;
  created_at: string;
  lifted_at: string | null;
  lifted_by: string | null;
};

export type StaffAudit = {
  id: string;
  actor_id: string;
  action: AuditAction;
  entity_type: 'article' | 'comment' | 'user' | 'category' | 'complaint';
  entity_id: string;
  reason: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  request_id: string | null;
  created_at: string;
};

export interface BlockStore {
  findByFirebaseUid(firebase_uid: string): Promise<BlockUser | null>;
  findById(user_id: string): Promise<BlockUser | null>;
  findActiveBlock(user_id: string): Promise<BlockRecord | null>;
  insertBlock(block: BlockRecord, audit: StaffAudit): Promise<void>;
  liftBlock(block: BlockRecord, audit: StaffAudit): Promise<void>;
  listAudits(actor_id: string | null): Promise<StaffAudit[]>;
}
