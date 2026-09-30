export type StaffAudit = {
  actor_id: string;
  action: 'article.hide' | 'article.soft_remove' | 'article.category.change';
  entity_id: string;
  reason: string | null;
};

export interface StaffAuditAppender {
  append(entry: StaffAudit): Promise<void>;
}
