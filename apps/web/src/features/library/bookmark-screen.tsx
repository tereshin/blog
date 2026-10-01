'use client';

import { translate, type Locale } from '@blog/i18n';
import { library_catalog } from '@blog/i18n/features/library';
import { Button, Card } from '@heroui/react';
import { EmptyState } from '../../shared/empty-state';
import type { FeedArticle } from '../feeds/feed-screen';

export function BookmarkScreen({
  locale,
  status,
  signed_in,
  items,
  on_remove,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'empty';
  signed_in: boolean;
  items: FeedArticle[];
  on_remove: (article_id: string) => void;
}) {
  if (!signed_in) {
    return (
      <main>
        <a href="/sign-in">{translate(locale, 'library.sign_in', library_catalog)}</a>
      </main>
    );
  }

  if (status === 'empty' || items.length === 0) {
    return (
      <main>
        <EmptyState title={translate(locale, 'library.bookmarks.empty', library_catalog)} />
      </main>
    );
  }

  return (
    <main>
      {items.map((article) => (
        <Card key={article.id}>
          <Card.Header>
            <Card.Title>{article.title}</Card.Title>
          </Card.Header>
          <Card.Footer>
            <Button variant="secondary" onPress={() => on_remove(article.id)}>
              {translate(locale, 'library.bookmarks.remove', library_catalog)}
            </Button>
          </Card.Footer>
        </Card>
      ))}
    </main>
  );
}
