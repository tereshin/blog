import { translate, type Locale } from '@blog/i18n';
import { oversight_catalog } from '@blog/i18n/features/oversight';
import { Card, Skeleton } from '@heroui/react';
import { EmptyState } from '../../shared/empty-state';

export type PlatformFigures = {
  users_signed_in_today: number;
  users_signed_in_last_30_days: number;
  new_users: number;
  articles_published: number;
  comments_written: number;
  open_complaints: number;
  public_site_answering: boolean;
};

export function StatisticsScreen({
  locale,
  status,
  figures,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'no-figures';
  figures: PlatformFigures | null;
}) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'oversight.loading', oversight_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'no-figures' || figures === null) {
    return (
      <main>
        <EmptyState title={translate(locale, 'oversight.no_figures', oversight_catalog)} />
      </main>
    );
  }

  const rows: Array<[string, string]> = [
    ['oversight.today', String(figures.users_signed_in_today)],
    ['oversight.last_30', String(figures.users_signed_in_last_30_days)],
    ['oversight.new_users', String(figures.new_users)],
    ['oversight.articles', String(figures.articles_published)],
    ['oversight.comments', String(figures.comments_written)],
    ['oversight.complaints', String(figures.open_complaints)],
    ['oversight.site', translate(locale, figures.public_site_answering ? 'oversight.yes' : 'oversight.no', oversight_catalog)],
  ];

  return (
    <main>
      {rows.map(([key, value]) => (
        <Card key={key}>
          <Card.Header>
            <Card.Title>
              {translate(locale, key, oversight_catalog)} {value}
            </Card.Title>
          </Card.Header>
        </Card>
      ))}
    </main>
  );
}
