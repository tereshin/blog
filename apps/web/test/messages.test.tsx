import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConversationListScreen } from '../src/features/messages/conversation-list-screen';
import {
  ConversationScreen,
  applyConversationLive,
  type DirectMessageView,
} from '../src/features/messages/conversation-screen';

const viewer_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const peer_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const conversation_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';
const other_conversation_id = '018f3c2a-7b10-7c3e-8f21-0000000000d2';

const read_message: DirectMessageView = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000e1',
  conversation_id,
  sender_id: viewer_id,
  body: 'Hello Ada',
  created_at: '2026-10-01T11:00:00Z',
  read_at: '2026-10-01T11:05:00Z',
};

afterEach(() => {
  cleanup();
});

describe('conversation list', () => {
  it('shows an empty state when the user has no conversations', () => {
    render(<ConversationListScreen locale="en" status="empty" conversations={[]} />);

    expect(screen.getByText('No conversations')).toBeTruthy();
  });

  it('shows the other user and the unread count', () => {
    render(
      <ConversationListScreen
        locale="en"
        status="default"
        conversations={[{ id: conversation_id, peer_user_id: peer_id, unread_count: 2 }]}
      />,
    );

    expect(screen.getByText(peer_id)).toBeTruthy();
    expect(screen.getByText('Unread 2')).toBeTruthy();
  });
});

describe('conversation', () => {
  it('shows the message and the sender read mark', () => {
    render(
      <ConversationScreen
        locale="en"
        status="default"
        viewer_id={viewer_id}
        conversation_id={conversation_id}
        messages={[read_message]}
        on_send={() => undefined}
      />,
    );

    expect(screen.getByText('Hello Ada')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('blocks an empty send and says the message must contain text', async () => {
    const user = userEvent.setup();
    const on_send = vi.fn();
    render(
      <ConversationScreen
        locale="en"
        status="message-invalid"
        viewer_id={viewer_id}
        conversation_id={conversation_id}
        messages={[read_message]}
        error_code="MESSAGE_BODY_REQUIRED"
        on_send={on_send}
      />,
    );

    expect(await screen.findByText('The message must contain text')).toBeTruthy();
    expect(screen.getByText('Hello Ada')).toBeTruthy();

    await user.clear(screen.getByRole('textbox', { name: 'Message' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(on_send).not.toHaveBeenCalled();
  });

  it('appends a live message for this conversation only', () => {
    const arrived: DirectMessageView = {
      ...read_message,
      id: '018f3c2a-7b10-7c3e-8f21-0000000000e2',
      sender_id: peer_id,
      body: 'Just arrived',
      read_at: null,
    };
    const outsider: DirectMessageView = {
      ...arrived,
      id: '018f3c2a-7b10-7c3e-8f21-0000000000e3',
      conversation_id: other_conversation_id,
      body: 'For someone else',
    };

    const next = applyConversationLive([read_message], conversation_id, {
      event_type: 'messages.direct_message.sent',
      conversation_id,
      message: arrived,
    });
    const skipped = applyConversationLive([read_message], conversation_id, {
      event_type: 'messages.direct_message.sent',
      conversation_id: other_conversation_id,
      message: outsider,
    });

    expect(next.map((message) => message.body)).toEqual(['Hello Ada', 'Just arrived']);
    expect(skipped.map((message) => message.body)).toEqual(['Hello Ada']);

    render(
      <ConversationScreen
        locale="en"
        status="live"
        viewer_id={viewer_id}
        conversation_id={conversation_id}
        messages={next}
        on_send={() => undefined}
      />,
    );

    expect(screen.getByText('Just arrived')).toBeTruthy();
    expect(screen.queryByText('For someone else')).toBeNull();
    expect(screen.getAllByText('Read')).toHaveLength(1);
  });
});
