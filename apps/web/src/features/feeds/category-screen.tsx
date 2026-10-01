'use client';

import { translate, type Locale } from '@blog/i18n';
import { feeds_catalog } from '@blog/i18n/features/feeds';
import { Button, Skeleton } from '@heroui/react';
import { EmptyState } from '../../shared/empty-state';

export function CategoryScreen({
  status,
  locale,
  name,
  following,
  on_follow,
  on_unfollow,
}: {
  status: 'default' | 'loading' | 'not-found' | 'following' | 'not-following' | 'error';
  locale: Locale;
  name: string;
  slug: string;
  following: boolean;
  on_follow: () => void;
  on_unfollow: () => void;
}) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'feeds.loading', feeds_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <main>
        <EmptyState title={translate(locale, 'feeds.category.not_found', feeds_catalog)} />
      </main>
    );
  }

  const followed = following || status === 'following';

  return (
    <main>
      <h1>{name}</h1>
      <Button variant="primary" onPress={followed ? on_unfollow : on_follow}>
        {translate(locale, followed ? 'feeds.category.unfollow' : 'feeds.category.follow', feeds_catalog)}
      </Button>
      <Button variant="secondary">{translate(locale, 'feeds.category.back', feeds_catalog)}</Button>
    </main>
  );
}
