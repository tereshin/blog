'use client';

import { translate, type Locale } from '@blog/i18n';
import { notices_catalog } from '@blog/i18n/features/notices';
import { Card, Skeleton } from '@heroui/react';
import Link from 'next/link';
import { EmptyState } from '../../shared/empty-state';

export type NoticeItem = {
  id: string;
  type: 'reply' | 'mention' | 'follow' | 'direct_message';
  actor_id: string;
  entity_type: 'comment' | 'user' | 'conversation';
  entity_id: string;
  created_at: string;
};

export function noticeHref(notice: NoticeItem): string {
  if (notice.type === 'follow') {
    return `/users/${notice.entity_id}`;
  }
  if (notice.type === 'direct_message') {
    return `/messages/${notice.entity_id}`;
  }
  return `/articles/${notice.entity_id}`;
}

export function NoticeListScreen({
  locale,
  status,
  notices,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'empty';
  notices: NoticeItem[];
}) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'notices.loading', notices_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'empty' || notices.length === 0) {
    return (
      <main>
        <EmptyState title={translate(locale, 'notices.empty', notices_catalog)} />
      </main>
    );
  }

  return (
    <main>
      {notices.map((notice) => {
        const label = translate(locale, `notices.type.${notice.type}`, notices_catalog);
        return (
          <Card key={notice.id}>
            <Card.Header>
              <Card.Title>
                <Link href={noticeHref(notice)}>{label}</Link>
              </Card.Title>
              <Card.Description>{notice.created_at}</Card.Description>
            </Card.Header>
          </Card>
        );
      })}
    </main>
  );
}
