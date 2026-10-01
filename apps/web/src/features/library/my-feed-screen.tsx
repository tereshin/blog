'use client';

import { translate, type Locale } from '@blog/i18n';
import { library_catalog } from '@blog/i18n/features/library';
import { Card, Skeleton } from '@heroui/react';
import { EmptyState } from '../../shared/empty-state';
import type { FeedArticle, FeedPageData } from '../feeds/feed-screen';

export function MyFeedScreen({
  locale,
  status,
  signed_in,
  page,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'empty' | 'error';
  signed_in: boolean;
  page: FeedPageData | null;
}) {
  if (!signed_in) {
    return (
      <main>
        <a href="/sign-in">{translate(locale, 'library.sign_in', library_catalog)}</a>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'library.loading', library_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const items = uniqueInOrder(page?.items ?? []);

  if (status === 'empty' || items.length === 0) {
    return (
      <main>
        <EmptyState title={translate(locale, 'library.my.empty', library_catalog)} />
      </main>
    );
  }

  return (
    <main>
      {items.map((article) => (
        <Card key={article.id}>
          <Card.Header>
            <Card.Title>{article.title}</Card.Title>
            <Card.Description>
              {article.language} {article.published_at}
            </Card.Description>
          </Card.Header>
        </Card>
      ))}
    </main>
  );
}

function uniqueInOrder(items: FeedArticle[]): FeedArticle[] {
  const seen = new Set<string>();
  return items.filter((article) => {
    if (seen.has(article.id)) {
      return false;
    }
    seen.add(article.id);
    return true;
  });
}
