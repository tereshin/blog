'use client';

import { translate, type Locale } from '@blog/i18n';
import { messages_catalog } from '@blog/i18n/features/messages';
import { Button, Card, Skeleton, Toast, toast } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../shared/empty-state';

export type DirectMessageView = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type LiveDirectMessageEvent = {
  event_type: 'messages.direct_message.sent';
  conversation_id: string;
  message: DirectMessageView;
};

export function applyConversationLive(
  messages: DirectMessageView[],
  conversation_id: string,
  event: LiveDirectMessageEvent,
): DirectMessageView[] {
  if (event.conversation_id !== conversation_id) {
    return messages;
  }
  if (messages.some((message) => message.id === event.message.id)) {
    return messages;
  }
  return [...messages, event.message];
}

export function ConversationScreen({
  locale,
  status,
  viewer_id,
  conversation_id,
  messages,
  error_code,
  on_send,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'empty-thread' | 'message-invalid' | 'live' | 'not-found';
  viewer_id: string;
  conversation_id: string;
  messages: DirectMessageView[];
  error_code?: string;
  on_send: (body: string) => void;
}) {
  const blocked =
    error_code === 'MESSAGE_BODY_REQUIRED' ? translate(locale, 'messages.body_required', messages_catalog) : null;

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'messages.loading', messages_catalog)}>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <main>
        <EmptyState title={translate(locale, 'messages.not_found', messages_catalog)} />
      </main>
    );
  }

  return (
    <>
      <Toast.Provider />
      <Notice message={blocked} />
      <main>
        <Link href="/messages">{translate(locale, 'messages.back', messages_catalog)}</Link>
        {status === 'empty-thread' || messages.length === 0 ? (
          <EmptyState title={translate(locale, 'messages.thread.empty', messages_catalog)} />
        ) : (
          messages.map((message) => (
            <Card key={message.id}>
              <Card.Header>
                <Card.Title>{message.body}</Card.Title>
                {message.sender_id === viewer_id && message.read_at ? (
                  <Card.Description>{translate(locale, 'messages.read', messages_catalog)}</Card.Description>
                ) : null}
              </Card.Header>
            </Card>
          ))
        )}
        <MessageForm locale={locale} conversation_id={conversation_id} on_send={on_send} />
      </main>
    </>
  );
}

function MessageForm({
  locale,
  conversation_id,
  on_send,
}: {
  locale: Locale;
  conversation_id: string;
  on_send: (body: string) => void;
}) {
  const [body, set_body] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);

  function send() {
    if (body.trim() === '') {
      set_invalid(translate(locale, 'messages.body_required', messages_catalog));
      return;
    }
    on_send(body);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <Notice message={invalid} />
      <textarea
        aria-label={translate(locale, 'messages.label', messages_catalog)}
        data-conversation-id={conversation_id}
        value={body}
        onChange={(event) => set_body(event.target.value)}
      />
      <Button variant="primary" onPress={send}>
        {translate(locale, 'messages.send', messages_catalog)}
      </Button>
    </form>
  );
}

function Notice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) {
      return;
    }
    toast.danger(message);
  }, [message]);

  return null;
}
