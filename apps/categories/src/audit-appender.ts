export type CategoryAudit = {
  actor_id: string;
  action: 'category.create';
  entity_type: 'category';
  entity_id: string;
  reason: null;
};

export interface AuditAppender {
  append(entry: CategoryAudit): Promise<void>;
}
