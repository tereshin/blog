import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookmarkScreen } from '../src/features/library/bookmark-screen';
import { MyFeedScreen } from '../src/features/library/my-feed-screen';
import type { FeedArticle } from '../src/features/feeds/feed-screen';

const followed: FeedArticle = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  slug: 'from-ada',
  title: 'From Ada',
  language: 'en',
  published_at: '2026-09-30T01:00:00Z',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
};

const category_article: FeedArticle = {
  ...followed,
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a2',
  slug: 'from-topic',
  title: 'From the topic',
  language: 'ru',
  published_at: '2026-09-30T00:00:00Z',
};

afterEach(() => {
  cleanup();
});

describe('my feed', () => {
  it('shows followed articles once, in the order the API returned', () => {
    render(
      <MyFeedScreen
        locale="en"
        status="default"
        signed_in
        page={{ items: [followed, category_article, followed], has_next: false, has_prev: false, next_cursor: null }}
      />,
    );

    const first = screen.getByText('From Ada');
    const second = screen.getByText('From the topic');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText('From Ada')).toHaveLength(1);
    expect(screen.queryByText('Unrelated essay')).toBeNull();
  });

  it('shows an empty state and hides the feed from a guest', () => {
    const { rerender } = render(
      <MyFeedScreen
        locale="en"
        status="empty"
        signed_in
        page={{ items: [], has_next: false, has_prev: false, next_cursor: null }}
      />,
    );
    expect(screen.getByText('No articles from followed sources')).toBeTruthy();

    rerender(
      <MyFeedScreen
        locale="en"
        status="default"
        signed_in={false}
        page={{ items: [followed], has_next: false, has_prev: false, next_cursor: null }}
      />,
    );
    expect(screen.queryByText('From Ada')).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveProperty('href', expect.stringContaining('/sign-in'));
  });
});

describe('bookmarks', () => {
  it('lists a bookmark and removes it', async () => {
    const user = userEvent.setup();
    const on_remove = vi.fn();
    const { rerender } = render(
      <BookmarkScreen locale="en" status="default" signed_in items={[followed]} on_remove={on_remove} />,
    );
    expect(screen.getByText('From Ada')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove bookmark' }));
    expect(on_remove).toHaveBeenCalledWith(followed.id);

    rerender(<BookmarkScreen locale="en" status="empty" signed_in items={[]} on_remove={on_remove} />);
    expect(screen.getByText('No bookmarks')).toBeTruthy();
    expect(screen.queryByText('From Ada')).toBeNull();
  });

  it('does not show the list to a guest', () => {
    render(<BookmarkScreen locale="en" status="default" signed_in={false} items={[followed]} on_remove={() => undefined} />);
    expect(screen.queryByText('From Ada')).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  });
});
