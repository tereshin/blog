import { ConversationListScreen } from '../../src/features/messages/conversation-list-screen';

const conversation_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';
const peer_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const empty = params.state === 'empty';

  return (
    <ConversationListScreen
      locale="en"
      status={empty ? 'empty' : 'default'}
      conversations={empty ? [] : [{ id: conversation_id, peer_user_id: peer_id, unread_count: 2 }]}
    />
  );
}
