export type CommentAudit = {
  actor_id: string;
  action: 'comment.hide';
  entity_id: string;
  reason: string;
};

export interface CommentAuditAppender {
  append(entry: CommentAudit): Promise<void>;
}
