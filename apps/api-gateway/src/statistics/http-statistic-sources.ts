import type { StatisticSources } from './platform-statistics';

async function count(url: string): Promise<number> {
  const response = await fetch(url);
  const body = (await response.json()) as { count?: number };
  return body.count ?? 0;
}

export class HttpStatisticSources implements StatisticSources {
  constructor(
    private readonly users_base_url: string,
    private readonly content_base_url: string,
    private readonly comments_base_url: string,
    private readonly site_base_url: string,
  ) {}

  usersSignedInToday(): Promise<number> {
    return count(`${this.users_base_url}/api/v1/internal/statistics/signed-in-today`);
  }

  usersSignedInLast30Days(): Promise<number> {
    return count(`${this.users_base_url}/api/v1/internal/statistics/signed-in-30-days`);
  }

  newUsers(): Promise<number> {
    return count(`${this.users_base_url}/api/v1/internal/statistics/new-users`);
  }

  articlesPublished(): Promise<number> {
    return count(`${this.content_base_url}/api/v1/internal/statistics/articles-published`);
  }

  commentsWritten(): Promise<number> {
    return count(`${this.comments_base_url}/api/v1/internal/statistics/comments-written`);
  }

  async openComplaints(): Promise<number> {
    const [articles, comments] = await Promise.all([
      count(`${this.content_base_url}/api/v1/internal/statistics/open-complaints`),
      count(`${this.comments_base_url}/api/v1/internal/statistics/open-complaints`),
    ]);
    return articles + comments;
  }

  async publicSiteAnswering(): Promise<boolean> {
    const response = await fetch(`${this.site_base_url}/health/live`);
    return response.ok;
  }
}
