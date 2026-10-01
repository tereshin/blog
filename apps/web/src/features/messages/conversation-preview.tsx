'use client';

import { useState } from 'react';
import {
  ConversationScreen,
  applyConversationLive,
  type DirectMessageView,
} from './conversation-screen';

const viewer_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';

export function ConversationPreview({
  conversation_id,
  messages,
  live,
}: {
  conversation_id: string;
  messages: DirectMessageView[];
  live?: DirectMessageView;
}) {
  const [thread, set_thread] = useState(messages);
  const shown = live
    ? applyConversationLive(thread, conversation_id, {
        event_type: 'messages.direct_message.sent',
        conversation_id,
        message: live,
      })
    : thread;

  return (
    <ConversationScreen
      locale="en"
      status={live ? 'live' : shown.length === 0 ? 'empty-thread' : 'default'}
      viewer_id={viewer_id}
      conversation_id={conversation_id}
      messages={shown}
      on_send={(body) =>
        set_thread([
          ...shown,
          {
            id: `local-${shown.length + 1}`,
            conversation_id,
            sender_id: viewer_id,
            body,
            created_at: new Date().toISOString(),
            read_at: null,
          },
        ])
      }
    />
  );
}
