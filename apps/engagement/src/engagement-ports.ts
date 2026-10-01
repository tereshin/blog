export interface PublishedArticles {
  isPublished(article_id: string): Promise<boolean>;
}

export interface KnownComments {
  exists(comment_id: string): Promise<boolean>;
}

export interface AccountAccess {
  isBlocked(user_id: string): Promise<boolean>;
}

export interface ViewWindow {
  claim(article_id: string, viewer_id: string, now_ms: number): Promise<boolean>;
}

const thirty_minutes_ms = 30 * 60 * 1000;

export class MemoryViewWindow implements ViewWindow {
  readonly pending = new Map<string, { expires_at: number; count: number }>();

  async claim(article_id: string, viewer_id: string, now_ms: number): Promise<boolean> {
    const key = `view:${article_id}:${viewer_id}`;
    const current = this.pending.get(key);
    if (current && current.expires_at > now_ms) {
      return false;
    }
    const count_key = `pending:${article_id}`;
    const count = this.pending.get(count_key);
    this.pending.set(key, { expires_at: now_ms + thirty_minutes_ms, count: 1 });
    this.pending.set(count_key, { expires_at: now_ms, count: (count?.count ?? 0) + 1 });
    return true;
  }

  async takePending(): Promise<Array<{ article_id: string; count: number }>> {
    const taken: Array<{ article_id: string; count: number }> = [];
    for (const [key, value] of this.pending) {
      if (!key.startsWith('pending:')) {
        continue;
      }
      this.pending.delete(key);
      if (value.count > 0) {
        taken.push({ article_id: key.slice('pending:'.length), count: value.count });
      }
    }
    return taken;
  }
}
