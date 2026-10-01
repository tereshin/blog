import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComplaintScreen } from '../src/features/notices/complaint-screen';
import { NoticeListScreen, type NoticeItem } from '../src/features/notices/notice-list-screen';

const reply: NoticeItem = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000aa',
  type: 'reply',
  actor_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
  entity_type: 'comment',
  entity_id: '018f3c2a-7b10-7c3e-8f21-0000000000c9',
  created_at: '2026-10-01T12:00:00Z',
};

const mention: NoticeItem = {
  ...reply,
  id: '018f3c2a-7b10-7c3e-8f21-0000000000ab',
  type: 'mention',
};

const follow: NoticeItem = {
  ...reply,
  id: '018f3c2a-7b10-7c3e-8f21-0000000000ac',
  type: 'follow',
  entity_type: 'user',
  entity_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
};

const direct_message: NoticeItem = {
  ...reply,
  id: '018f3c2a-7b10-7c3e-8f21-0000000000ad',
  type: 'direct_message',
  entity_type: 'conversation',
  entity_id: '018f3c2a-7b10-7c3e-8f21-0000000000d1',
};

afterEach(() => {
  cleanup();
});

describe('notices', () => {
  it('translates each notice and opens the matching screen', () => {
    render(<NoticeListScreen locale="en" status="default" notices={[reply, mention, follow, direct_message]} />);

    expect(screen.getByRole('link', { name: 'Someone replied to your comment' })).toHaveProperty(
      'href',
      expect.stringContaining(`/articles/${reply.entity_id}`),
    );
    expect(screen.getByRole('link', { name: 'Someone mentioned you' })).toHaveProperty(
      'href',
      expect.stringContaining(`/articles/${mention.entity_id}`),
    );
    expect(screen.getByRole('link', { name: 'Someone followed you' })).toHaveProperty(
      'href',
      expect.stringContaining(`/users/${follow.entity_id}`),
    );
    expect(screen.getByRole('link', { name: 'You have a new message' })).toHaveProperty(
      'href',
      expect.stringContaining(`/messages/${direct_message.entity_id}`),
    );
    expect(screen.queryByText(/email/i)).toBeNull();
    expect(screen.queryByText(/phone/i)).toBeNull();
  });

  it('shows an empty state when there are no notices', () => {
    render(<NoticeListScreen locale="en" status="empty" notices={[]} />);
    expect(screen.getByText('No notices')).toBeTruthy();
  });
});

describe('complaint', () => {
  it('blocks a complaint that has no reason', async () => {
    const user = userEvent.setup();
    const on_submit = vi.fn();
    render(
      <ComplaintScreen
        locale="en"
        status="reason-required"
        target_type="article"
        target_id="018f3c2a-7b10-7c3e-8f21-0000000000a1"
        error_code="COMPLAINT_REASON_REQUIRED"
        on_submit={on_submit}
      />,
    );

    expect(await screen.findByText('A reason must be present')).toBeTruthy();
    await user.clear(screen.getByRole('textbox', { name: 'Reason' }));
    await user.click(screen.getByRole('button', { name: 'Submit complaint' }));
    expect(on_submit).not.toHaveBeenCalled();
  });

  it('submits a reason for an article', async () => {
    const user = userEvent.setup();
    const on_submit = vi.fn();
    render(
      <ComplaintScreen
        locale="en"
        status="default"
        target_type="article"
        target_id="018f3c2a-7b10-7c3e-8f21-0000000000a1"
        on_submit={on_submit}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'This harms readers');
    await user.click(screen.getByRole('button', { name: 'Submit complaint' }));
    expect(on_submit).toHaveBeenCalledWith('This harms readers');
  });
});
