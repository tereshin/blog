import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoryScreen } from '../src/features/feeds/category-screen';
import { FeedScreen, type FeedPageData } from '../src/features/feeds/feed-screen';

const newer = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  slug: 'newer-essay',
  title: 'Newer essay',
  language: 'en',
  published_at: '2026-09-30T01:00:00Z',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
};

const older = {
  ...newer,
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a2',
  slug: 'older-essay',
  title: 'Older essay',
  language: 'ru',
  published_at: '2026-09-30T00:00:00Z',
};

const fresh_page: FeedPageData = {
  items: [newer, older],
  has_next: true,
  has_prev: false,
  next_cursor: 'c:older',
};

afterEach(() => {
  cleanup();
});

describe('public feeds', () => {
  it('shows Fresh newest first and hides My feed from a guest', () => {
    render(<FeedScreen kind="fresh" status="default" signed_in={false} locale="en" page={fresh_page} />);

    expect(screen.getByRole('link', { name: 'Fresh' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Popular' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'My feed' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Content languages' })).toBeNull();
    const newer_title = screen.getByText('Newer essay');
    const older_title = screen.getByText('Older essay');
    expect(newer_title.compareDocumentPosition(older_title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows Popular in the order the payload arrived', () => {
    render(
      <FeedScreen
        kind="popular"
        status="default"
        signed_in={false}
        locale="en"
        page={{ ...fresh_page, items: [older, newer] }}
      />,
    );

    const older_title = screen.getByText('Older essay');
    const newer_title = screen.getByText('Newer essay');
    expect(older_title.compareDocumentPosition(newer_title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'My feed' })).toBeNull();
  });

  it('shows a skeleton while loading and an empty state when nothing is published', () => {
    const { rerender } = render(
      <FeedScreen kind="fresh" status="loading" signed_in={false} locale="en" page={null} />,
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();

    rerender(<FeedScreen kind="fresh" status="empty" signed_in={false} locale="en" page={{ ...fresh_page, items: [] }} />);
    expect(screen.getByText('No published articles')).toBeTruthy();
  });

  it('toasts a rate limit and keeps the page', async () => {
    render(
      <FeedScreen
        kind="fresh"
        status="error"
        signed_in={false}
        locale="en"
        page={fresh_page}
        error_code="RATE_LIMITED"
        error_action="anonymous_read"
      />,
    );

    expect(await screen.findByText('Anonymous reads are limited')).toBeTruthy();
    expect(screen.getByText('Newer essay')).toBeTruthy();
  });

  it('lets a signed-in user choose a content language', async () => {
    const user = userEvent.setup();
    const on_languages = vi.fn();
    render(
      <FeedScreen
        kind="fresh"
        status="default"
        signed_in
        locale="en"
        page={fresh_page}
        content_languages={null}
        on_languages={on_languages}
      />,
    );

    expect(screen.getByRole('link', { name: 'My feed' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Content languages' }));
    await user.click(await screen.findByRole('menuitem', { name: 'English' }));
    expect(on_languages).toHaveBeenCalledWith(['en']);
  });
});

describe('category screen', () => {
  it('follows and unfollows a category and shows not-found', async () => {
    const user = userEvent.setup();
    const on_follow = vi.fn();
    const on_unfollow = vi.fn();
    const { rerender } = render(
      <CategoryScreen
        status="default"
        locale="en"
        name="Test Topic"
        slug="test-topic"
        following={false}
        on_follow={on_follow}
        on_unfollow={on_unfollow}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Follow' }));
    expect(on_follow).toHaveBeenCalledOnce();

    rerender(
      <CategoryScreen
        status="following"
        locale="en"
        name="Test Topic"
        slug="test-topic"
        following
        on_follow={on_follow}
        on_unfollow={on_unfollow}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Unfollow' }));
    expect(on_unfollow).toHaveBeenCalledOnce();

    rerender(
      <CategoryScreen
        status="not-found"
        locale="en"
        name=""
        slug="missing"
        following={false}
        on_follow={on_follow}
        on_unfollow={on_unfollow}
      />,
    );
    expect(screen.getByText('No category has this slug')).toBeTruthy();
  });

  it('shows a skeleton while the category loads', () => {
    render(
      <CategoryScreen
        status="loading"
        locale="en"
        name=""
        slug="test-topic"
        following={false}
        on_follow={() => undefined}
        on_unfollow={() => undefined}
      />,
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
  });
});
