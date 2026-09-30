import { ArticleError } from './article-error';
import type { ArticleStore } from './article-store';
import type { ComplaintStore } from './complaint-store';
import type { StaffAudit, StaffAuditAppender } from './staff-audit';
import { uuidV7 } from './uuid-v7';

export interface KnownCategories {
  exists(category_id: string): Promise<boolean>;
}

type StaffRole = 'user' | 'moderator' | 'administrator';

export class StaffArticleService {
  now: () => Date = () => new Date();

  constructor(
    private readonly articles: ArticleStore,
    private readonly complaints: ComplaintStore,
    private readonly categories: KnownCategories,
    private readonly audit: StaffAuditAppender,
  ) {}

  async hide(input: { actor_id: string; role: StaffRole; article_id: string; reason: string }) {
    this.requireStaff(input.role);
    const reason = this.requireReason(input.reason);
    const article = await this.requireArticle(input.article_id);
    article.status = 'hidden';
    await this.complaints.closeOpen(article.id);
    await this.articles.commit(article, {
      id: uuidV7(this.now().getTime()),
      event_type: 'content.article.hidden',
      aggregate_id: article.id,
      payload: { article_id: article.id },
      producer: 'content',
      event_version: 1,
    });
    await this.appendAudit({ actor_id: input.actor_id, action: 'article.hide', entity_id: article.id, reason });
    return article;
  }

  async moveCategory(input: { actor_id: string; role: StaffRole; article_id: string; category_id: string }) {
    this.requireStaff(input.role);
    if (!(await this.categories.exists(input.category_id))) {
      throw new ArticleError('CATEGORY_NOT_FOUND');
    }
    const article = await this.requireArticle(input.article_id);
    article.category_id = input.category_id;
    await this.articles.update(article);
    await this.appendAudit({
      actor_id: input.actor_id,
      action: 'article.category.change',
      entity_id: article.id,
      reason: null,
    });
    return article;
  }

  async staffRead(input: { role: StaffRole; article_id: string }) {
    this.requireStaff(input.role);
    return this.requireArticle(input.article_id);
  }

  async softRemove(input: { actor_id: string; role: StaffRole; article_id: string; reason: string }) {
    if (input.role !== 'administrator') {
      throw new ArticleError('ADMIN_ONLY');
    }
    const reason = this.requireReason(input.reason);
    const article = await this.requireArticle(input.article_id);
    article.status = 'soft_removed';
    article.removed_by = 'staff';
    await this.articles.commit(article, {
      id: uuidV7(this.now().getTime()),
      event_type: 'content.article.soft_removed',
      aggregate_id: article.id,
      payload: { article_id: article.id, removed_by: 'staff' },
      producer: 'content',
      event_version: 1,
    });
    await this.appendAudit({
      actor_id: input.actor_id,
      action: 'article.soft_remove',
      entity_id: article.id,
      reason,
    });
    return article;
  }

  private requireStaff(role: StaffRole): void {
    if (role !== 'moderator' && role !== 'administrator') {
      throw new ArticleError('STAFF_FORBIDDEN');
    }
  }

  private requireReason(reason: string): string {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      throw new ArticleError('REASON_REQUIRED');
    }
    return trimmed;
  }

  private async requireArticle(article_id: string) {
    const article = await this.articles.findById(article_id);
    if (!article) {
      throw new ArticleError('ARTICLE_NOT_FOUND');
    }
    return article;
  }

  private async appendAudit(entry: StaffAudit): Promise<void> {
    try {
      await this.audit.append(entry);
    } catch {
      await this.audit.append(entry);
    }
  }
}
