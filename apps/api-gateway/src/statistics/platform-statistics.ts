export type PlatformStatistics = {
  users_signed_in_today: number;
  users_signed_in_last_30_days: number;
  new_users: number;
  articles_published: number;
  comments_written: number;
  open_complaints: number;
  public_site_answering: boolean;
};

export interface StatisticSources {
  usersSignedInToday(): Promise<number>;
  usersSignedInLast30Days(): Promise<number>;
  newUsers(): Promise<number>;
  articlesPublished(): Promise<number>;
  commentsWritten(): Promise<number>;
  openComplaints(): Promise<number>;
  publicSiteAnswering(): Promise<boolean>;
}

export class StatisticsError extends Error {
  readonly status_code = 403;

  constructor(readonly code: 'ADMIN_ONLY' = 'ADMIN_ONLY') {
    super(code);
  }
}

export class StatisticsService {
  constructor(private readonly sources: StatisticSources) {}

  async report(role: string): Promise<PlatformStatistics> {
    if (role !== 'administrator') {
      throw new StatisticsError();
    }
    const [
      users_signed_in_today,
      users_signed_in_last_30_days,
      new_users,
      articles_published,
      comments_written,
      open_complaints,
      public_site_answering,
    ] = await Promise.all([
      this.sources.usersSignedInToday(),
      this.sources.usersSignedInLast30Days(),
      this.sources.newUsers(),
      this.sources.articlesPublished(),
      this.sources.commentsWritten(),
      this.sources.openComplaints(),
      this.sources.publicSiteAnswering(),
    ]);
    return {
      users_signed_in_today,
      users_signed_in_last_30_days,
      new_users,
      articles_published,
      comments_written,
      open_complaints,
      public_site_answering,
    };
  }
}
