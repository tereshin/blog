import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComplaintDetailScreen } from '../src/features/moderation/complaint-detail-screen';
import { ComplaintListScreen } from '../src/features/moderation/complaint-list-screen';
import { StaffArticleScreen } from '../src/features/moderation/staff-article-screen';

const complaint = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000f1',
  target_type: 'article' as const,
  target_id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
  reason: 'This harms readers',
};

const article = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  title: 'Staff copy',
  body: 'The full staff text',
  status: 'published',
  removed_by: null as string | null,
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c2',
};

afterEach(() => {
  cleanup();
});

describe('open complaints', () => {
  it('shows an empty state when nothing is open', () => {
    render(<ComplaintListScreen locale="en" status="empty" complaints={[]} has_next={false} on_next={() => undefined} />);
    expect(screen.getByText('No open complaints')).toBeTruthy();
  });
});

describe('complaint detail', () => {
  it('blocks a dismissal that has no reason and keeps the complaint open', async () => {
    const user = userEvent.setup();
    const on_dismiss = vi.fn();
    const on_hide = vi.fn();
    render(
      <ComplaintDetailScreen
        locale="en"
        status="reason-required"
        complaint={complaint}
        error_code="REASON_REQUIRED"
        on_dismiss={on_dismiss}
        on_hide={on_hide}
      />,
    );

    expect(await screen.findByText('A reason must be present')).toBeTruthy();
    expect(screen.getByText('This harms readers')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(on_dismiss).not.toHaveBeenCalled();
    expect(on_hide).not.toHaveBeenCalled();
  });
});

describe('staff article', () => {
  it('shows the full text only on this screen', () => {
    render(
      <StaffArticleScreen
        locale="en"
        status="default"
        role="moderator"
        article={{ ...article, status: 'soft_removed', removed_by: 'author' }}
        categories={[{ id: article.category_id, name: 'Essays' }]}
        on_move={() => undefined}
        on_remove={() => undefined}
      />,
    );

    expect(screen.getByText('The full staff text')).toBeTruthy();
    expect(screen.getByText('Withdrawn by the author')).toBeTruthy();
    expect(screen.queryByText('Hidden by staff')).toBeNull();
  });

  it('moves the category without asking for a reason', async () => {
    const user = userEvent.setup();
    const on_move = vi.fn();
    render(
      <StaffArticleScreen
        locale="en"
        status="category-moved"
        role="moderator"
        article={article}
        categories={[{ id: article.category_id, name: 'Essays' }]}
        on_move={on_move}
        on_remove={() => undefined}
      />,
    );

    expect(screen.getByText('Essays')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Move reason' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Move category' }));
    expect(on_move).toHaveBeenCalledWith(article.category_id);
  });

  it('refuses a moderator soft-remove and leaves the article', async () => {
    render(
      <StaffArticleScreen
        locale="en"
        status="admin-only"
        role="moderator"
        article={article}
        error_code="ADMIN_ONLY"
        categories={[{ id: article.category_id, name: 'Essays' }]}
        on_move={() => undefined}
        on_remove={() => undefined}
      />,
    );

    expect(await screen.findByText('Only an administrator can soft-remove an article')).toBeTruthy();
    expect(screen.getByText('The full staff text')).toBeTruthy();
  });
});
