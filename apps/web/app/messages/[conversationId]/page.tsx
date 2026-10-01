import { ConversationPreview } from '../../../src/features/messages/conversation-preview';
import type { DirectMessageView } from '../../../src/features/messages/conversation-screen';

const viewer_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ conversationId }, query] = await Promise.all([params, searchParams]);
  const read_message: DirectMessageView = {
    id: '018f3c2a-7b10-7c3e-8f21-0000000000e1',
    conversation_id: conversationId,
    sender_id: viewer_id,
    body: 'Hello Ada',
    created_at: '2026-10-01T11:00:00Z',
    read_at: '2026-10-01T11:05:00Z',
  };
  const arrived: DirectMessageView = {
    id: '018f3c2a-7b10-7c3e-8f21-0000000000e2',
    conversation_id: conversationId,
    sender_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
    body: 'Just arrived',
    created_at: '2026-10-01T11:06:00Z',
    read_at: null,
  };

  return (
    <ConversationPreview
      conversation_id={conversationId}
      messages={query.state === 'empty' ? [] : [read_message]}
      live={query.state === 'live' ? arrived : undefined}
    />
  );
}
