'use client';

import { translate, type Locale } from '@blog/i18n';
import { feeds_catalog } from '@blog/i18n/features/feeds';
import { Button, Card, Dropdown, Label, Skeleton, Toast, toast } from '@heroui/react';
import { useEffect } from 'react';
import { EmptyState } from '../../shared/empty-state';

export type FeedArticle = {
  id: string;
  slug: string;
  title: string;
  language: string;
  published_at: string;
  author_id: string;
  category_id: string;
};

export type FeedPageData = {
  items: FeedArticle[];
  has_next: boolean;
  has_prev: boolean;
  next_cursor: string | null;
};

const content_language_keys = ['en', 'sr-Latn', 'ru', 'clear'] as const;

export function FeedScreen({
  kind,
  status,
  signed_in,
  locale,
  page,
  error_code,
  error_action,
  on_languages,
  on_next,
}: {
  kind: 'fresh' | 'popular';
  status: 'default' | 'loading' | 'empty' | 'error';
  signed_in: boolean;
  locale: Locale;
  page: FeedPageData | null;
  content_languages?: string[] | null;
  error_code?: string;
  error_action?: string;
  on_languages?: (languages: string[] | null) => void;
  on_next?: () => void;
}) {
  const message =
    status === 'error' && error_code === 'RATE_LIMITED'
      ? translate(locale, `feeds.rate_limited.${error_action ?? 'anonymous_read'}`, feeds_catalog)
      : null;

  return (
    <>
      <Toast.Provider />
      <RateLimitNotice message={message} />
      <main>
        <nav className="flex gap-2">
          <a href="/feeds/fresh">{translate(locale, 'feeds.nav.fresh', feeds_catalog)}</a>
          <a href="/feeds/popular">{translate(locale, 'feeds.nav.popular', feeds_catalog)}</a>
          {signed_in ? <a href="/feeds/my">{translate(locale, 'feeds.nav.my', feeds_catalog)}</a> : null}
          {signed_in ? (
            <Dropdown>
              <Button aria-label={translate(locale, 'feeds.languages', feeds_catalog)} variant="secondary">
                {translate(locale, 'feeds.languages', feeds_catalog)}
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  onAction={(key) => {
                    if (!on_languages) {
                      return;
                    }
                    on_languages(key === 'clear' ? null : [String(key)]);
                  }}
                >
                  {content_language_keys.map((key) => (
                    <Dropdown.Item key={key} id={key} textValue={translate(locale, `feeds.language.${key}`, feeds_catalog)}>
                      <Label>{translate(locale, `feeds.language.${key}`, feeds_catalog)}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : null}
        </nav>
        {status === 'loading' ? (
          <div role="status" aria-label={translate(locale, 'feeds.loading', feeds_catalog)}>
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : null}
        {status === 'empty' ? <EmptyState title={translate(locale, 'feeds.empty', feeds_catalog)} /> : null}
        {status === 'default' || status === 'error' ? (
          <section aria-label={kind}>
            {page?.items.map((article) => (
              <Card key={article.id}>
                <Card.Header>
                  <Card.Title>{article.title}</Card.Title>
                  <Card.Description>
                    {article.language} {article.published_at}
                  </Card.Description>
                </Card.Header>
              </Card>
            ))}
            {page?.has_next ? (
              <Button variant="secondary" onPress={on_next}>
                {translate(locale, 'feeds.next', feeds_catalog)}
              </Button>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}

function RateLimitNotice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) {
      return;
    }
    toast.danger(message);
  }, [message]);

  return null;
}
