'use client';

import { translate, type Locale } from '@blog/i18n';
import { messages_catalog } from '@blog/i18n/features/messages';
import { Card, Skeleton } from '@heroui/react';
import Link from 'next/link';
import { EmptyState } from '../../shared/empty-state';

export type ConversationSummary = {
  id: string;
  peer_user_id: string;
  unread_count: number;
};

export function ConversationListScreen({
  locale,
  status,
  conversations,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'empty';
  conversations: ConversationSummary[];
}) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'messages.loading', messages_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'empty' || conversations.length === 0) {
    return (
      <main>
        <EmptyState title={translate(locale, 'messages.empty', messages_catalog)} />
      </main>
    );
  }

  return (
    <main>
      {conversations.map((conversation) => (
        <Card key={conversation.id}>
          <Card.Header>
            <Card.Title>
              <Link href={`/messages/${conversation.id}`}>{conversation.peer_user_id}</Link>
            </Card.Title>
            <Card.Description>
              {translate(locale, 'messages.unread', messages_catalog)} {conversation.unread_count}
            </Card.Description>
          </Card.Header>
        </Card>
      ))}
    </main>
  );
}
