export type ComplaintView = {
  id: string;
  target_type: 'article' | 'comment';
  target_id: string;
  reporter_id: string;
  reason: string;
  status: 'open' | 'dismissed';
  created_at: string;
  resolution_reason?: string | null;
};

export type ComplaintPage = {
  items: ComplaintView[];
  has_next: boolean;
  has_prev: boolean;
  next_cursor: string | null;
};

export interface ComplaintDesk {
  listOpen(): Promise<ComplaintView[]>;
  dismiss(complaint_id: string, reason: string): Promise<ComplaintView | null>;
}

export type ComplaintAuditEntry = {
  action: 'complaint.dismiss';
  actor_id: string;
  entity_id: string;
  reason: string;
};

export interface ComplaintAuditAppender {
  append(entry: ComplaintAuditEntry): Promise<void>;
}

const status_by_code = {
  AUTH_REQUIRED: 401,
  STAFF_FORBIDDEN: 403,
  REASON_REQUIRED: 422,
  COMPLAINT_NOT_FOUND: 404,
} as const;

export type ComplaintReviewErrorCode = keyof typeof status_by_code;

export class ComplaintReviewError extends Error {
  readonly status_code: number;

  constructor(readonly code: ComplaintReviewErrorCode) {
    super(code);
    this.status_code = status_by_code[code];
  }
}

export class ComplaintReviewService {
  constructor(
    private readonly articles: ComplaintDesk,
    private readonly comments: ComplaintDesk,
    private readonly audit: ComplaintAuditAppender,
  ) {}

  async listOpen(): Promise<ComplaintPage> {
    const [article_rows, comment_rows] = await Promise.all([
      this.articles.listOpen(),
      this.comments.listOpen(),
    ]);
    return {
      items: [...article_rows, ...comment_rows].filter((row) => row.status === 'open'),
      has_next: false,
      has_prev: false,
      next_cursor: null,
    };
  }

  async dismiss(input: {
    complaint_id: string;
    target_type: 'article' | 'comment';
    reason: string;
    actor_id: string;
    role: string;
  }): Promise<ComplaintView> {
    if (!input.actor_id) {
      throw new ComplaintReviewError('AUTH_REQUIRED');
    }
    if (input.role !== 'moderator' && input.role !== 'administrator') {
      throw new ComplaintReviewError('STAFF_FORBIDDEN');
    }
    const reason = input.reason.trim();
    if (reason.length === 0) {
      throw new ComplaintReviewError('REASON_REQUIRED');
    }
    const desk = input.target_type === 'article' ? this.articles : this.comments;
    const complaint = await desk.dismiss(input.complaint_id, reason);
    if (!complaint) {
      throw new ComplaintReviewError('COMPLAINT_NOT_FOUND');
    }
    await this.record({
      action: 'complaint.dismiss',
      actor_id: input.actor_id,
      entity_id: complaint.id,
      reason,
    });
    return { ...complaint, status: 'dismissed', resolution_reason: reason };
  }

  private async record(entry: ComplaintAuditEntry): Promise<void> {
    try {
      await this.audit.append(entry);
    } catch {
      await this.audit.append(entry);
    }
  }
}
