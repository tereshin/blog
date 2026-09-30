import { ArticleError } from './article-error';
import type { ArticleStore } from './article-store';
import type { ArticleComplaint, ComplaintStore } from './complaint-store';
import { uuidV7 } from './uuid-v7';

export type ComplaintCreated = {
  id: string;
  target_type: 'article';
  target_id: string;
  status: 'open';
};

export class ComplaintService {
  now: () => Date = () => new Date();

  constructor(
    private readonly articles: ArticleStore,
    private readonly complaints: ComplaintStore,
  ) {}

  async file(input: {
    article_id: string;
    reporter_id: string;
    reason: string;
  }): Promise<ComplaintCreated> {
    const reason = input.reason.trim();
    if (reason.length === 0) {
      throw new ArticleError('COMPLAINT_REASON_REQUIRED');
    }
    const article = await this.articles.findById(input.article_id);
    if (!article) {
      throw new ArticleError('ARTICLE_NOT_FOUND');
    }
    const complaint: ArticleComplaint = {
      id: uuidV7(this.now().getTime()),
      article_id: article.id,
      reporter_id: input.reporter_id,
      reason,
      status: 'open',
      created_at: this.now().toISOString(),
    };
    await this.complaints.insert(complaint);
    return {
      id: complaint.id,
      target_type: 'article',
      target_id: article.id,
      status: 'open',
    };
  }

  async listOpen(): Promise<ArticleComplaint[]> {
    return this.complaints.listOpen();
  }
}
