import { describe, expect, it } from 'vitest';
import { MemoryMessageStore } from '../src/memory-message-store';
import { MessageService } from '../src/message-service';

const sender_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const recipient_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const outsider_id = '018f3c2a-7b10-7c3e-8f21-0000000000b3';

function service(blocked = false) {
  const store = new MemoryMessageStore();
  return { store, messages: new MessageService(store, { async isBlocked() { return blocked; } }) };
}

describe('direct messages', () => {
  it('keeps a message for an absent recipient and marks it read', async () => {
    const { store, messages } = service();
    const sent = await messages.send({ sender_id, peer_id: recipient_id, body: 'Hello later' });
    const inbox = await messages.list(recipient_id);
    expect(inbox.items).toEqual([
      expect.objectContaining({ id: sent.conversation_id, peer_user_id: sender_id, unread_count: 1 }),
    ]);
    const read = await messages.markRead(recipient_id, sent.conversation_id);
    const thread = await messages.thread(sender_id, sent.conversation_id);
    expect(thread[0]?.read_at).toBe(read.read_at);
    expect(store.outbox).toHaveLength(1);
    expect(store.outbox[0]?.event_type).toBe('messages.direct_message.sent');
    await expect(messages.thread(outsider_id, sent.conversation_id)).rejects.toMatchObject({
      code: 'CONVERSATION_NOT_FOUND',
    });
  });

  it('refuses an empty body and a blocked sender', async () => {
    const open = service();
    await expect(open.messages.send({ sender_id, peer_id: recipient_id, body: '  ' })).rejects.toMatchObject({
      code: 'MESSAGE_BODY_REQUIRED',
    });
    expect(open.store.messages).toHaveLength(0);
    const blocked = service(true);
    await expect(blocked.messages.send({ sender_id, peer_id: recipient_id, body: 'Hi' })).rejects.toMatchObject({
      code: 'ACCOUNT_BLOCKED',
    });
  });
});
