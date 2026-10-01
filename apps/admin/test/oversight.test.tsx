import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AuditScreen } from '../src/features/oversight/audit-screen';
import { StatisticsScreen } from '../src/features/oversight/statistics-screen';

const figures = {
  users_signed_in_today: 0,
  users_signed_in_last_30_days: 4,
  new_users: 1,
  articles_published: 2,
  comments_written: 3,
  open_complaints: 1,
  public_site_answering: true,
};

const row = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000aa',
  action: 'hide',
  actor_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
  entity_id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  reason: 'Harm',
  created_at: '2026-10-01T12:00:00Z',
};

afterEach(() => {
  cleanup();
});

describe('statistics', () => {
  it('shows the seven figures, including a zero', () => {
    render(<StatisticsScreen locale="en" status="default" figures={figures} />);

    expect(screen.getByText('Signed in today 0')).toBeTruthy();
    expect(screen.getByText('Signed in, last 30 days 4')).toBeTruthy();
    expect(screen.getByText('New users 1')).toBeTruthy();
    expect(screen.getByText('Articles published 2')).toBeTruthy();
    expect(screen.getByText('Comments written 3')).toBeTruthy();
    expect(screen.getByText('Open complaints 1')).toBeTruthy();
    expect(screen.getByText('Public site answering Yes')).toBeTruthy();
  });

  it('shows a moderator no platform figures', () => {
    render(<StatisticsScreen locale="en" status="no-figures" figures={null} />);

    expect(screen.getByText('No platform statistics')).toBeTruthy();
    expect(screen.queryByText(/Signed in today/)).toBeNull();
  });
});

describe('audit trail', () => {
  it('lists each action and reason with no edit or delete', () => {
    render(<AuditScreen locale="en" status="default" rows={[row]} has_next={false} on_next={() => undefined} />);

    expect(screen.getByText('hide')).toBeTruthy();
    expect(screen.getByText('Harm')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('shows a moderator only their own rows', () => {
    render(
      <AuditScreen
        locale="en"
        status="own"
        rows={[{ ...row, action: 'block', reason: 'Repeated harm' }]}
        has_next={false}
        on_next={() => undefined}
      />,
    );

    expect(screen.getByText('block')).toBeTruthy();
    expect(screen.getByText('Repeated harm')).toBeTruthy();
    expect(screen.queryByText('hide')).toBeNull();
  });

  it('shows an empty trail', () => {
    render(<AuditScreen locale="en" status="empty" rows={[]} has_next={false} on_next={() => undefined} />);
    expect(screen.getByText('No audit rows')).toBeTruthy();
  });
});
