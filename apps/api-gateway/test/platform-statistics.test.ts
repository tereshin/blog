import { describe, expect, it } from 'vitest';
import { StatisticsError, StatisticsService, type StatisticSources } from '../src/statistics/platform-statistics';

function sources(calls: string[]): StatisticSources {
  return {
    async usersSignedInToday() {
      calls.push('today');
      return 1;
    },
    async usersSignedInLast30Days() {
      calls.push('month');
      return 2;
    },
    async newUsers() {
      calls.push('new');
      return 3;
    },
    async articlesPublished() {
      calls.push('articles');
      return 4;
    },
    async commentsWritten() {
      calls.push('comments');
      return 5;
    },
    async openComplaints() {
      calls.push('complaints');
      return 0;
    },
    async publicSiteAnswering() {
      calls.push('site');
      return true;
    },
  };
}

describe('platform statistics', () => {
  it('returns the six figures and whether the public site is answering', async () => {
    const calls: string[] = [];
    const statistics = new StatisticsService(sources(calls));

    await expect(statistics.report('administrator')).resolves.toEqual({
      users_signed_in_today: 1,
      users_signed_in_last_30_days: 2,
      new_users: 3,
      articles_published: 4,
      comments_written: 5,
      open_complaints: 0,
      public_site_answering: true,
    });
    expect(calls).toHaveLength(7);
  });

  it('returns no figures to a moderator', async () => {
    const calls: string[] = [];
    const statistics = new StatisticsService(sources(calls));

    await expect(statistics.report('moderator')).rejects.toBeInstanceOf(StatisticsError);
    expect(calls).toEqual([]);
  });
});
