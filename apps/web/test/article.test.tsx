import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArticleScreen, applyArticleLive, writeArticleCache, type ArticlePayload } from '../src/features/article/article-screen';

const published: ArticlePayload = {
  view: 'published',
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  title: 'Newer essay',
  rendered_html: '<p>The published text</p>',
  images: [{ media_id: '018f3c2a-7b10-7c3e-8f21-0000000000d1', url: 'https://media.local/cover' }],
  like_count: 2,
  comment_count: 1,
  view_count: 9,
  liked_by_viewer: false,
  is_author: false,
  comments: [
    {
      id: '018f3c2a-7b10-7c3e-8f21-0000000000e1',
      body: 'First comment',
      depth: 1,
      parent_id: null,
      mentions: [],
      view: 'visible',
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe('article screen', () => {
  it('shows the published text, image, comments, and counts to a guest', () => {
    render(<ArticleScreen locale="en" status="default" article={published} />);

    expect(screen.getByRole('heading', { name: 'Newer essay' })).toBeTruthy();
    expect(screen.getByText('The published text')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Newer essay' })).toBeTruthy();
    expect(screen.getByText('First comment')).toBeTruthy();
    expect(screen.getByText('Likes 2')).toBeTruthy();
    expect(screen.getByText('Comments 1')).toBeTruthy();
    expect(screen.getByText('Views 9')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
  });

  it('shows a published article with no image', () => {
    render(<ArticleScreen locale="en" status="default" article={{ ...published, images: [] }} />);
    expect(screen.getByText('The published text')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('hides the text when the article is unavailable and keeps it for the author', () => {
    const { rerender } = render(
      <ArticleScreen locale="en" status="unavailable" article={{ ...published, view: 'unavailable', rendered_html: undefined, title: undefined }} />,
    );
    expect(screen.getByText('This article is not available')).toBeTruthy();
    expect(screen.queryByText(/draft|hidden|withdrawn/i)).toBeNull();
    expect(screen.queryByText('The published text')).toBeNull();

    rerender(
      <ArticleScreen
        locale="en"
        status="author"
        article={{ ...published, view: 'author', status: 'draft', is_author: true }}
      />,
    );
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('The published text')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit' })).toBeTruthy();
  });

  it('nests a reply and shows a deeper reply flat', () => {
    render(
      <ArticleScreen
        locale="en"
        status="default"
        article={{
          ...published,
          comments: [
            { id: 'c1', body: 'Top comment', depth: 1, parent_id: null, mentions: [], view: 'visible' },
            { id: 'c2', body: 'Nested reply', depth: 2, parent_id: 'c1', mentions: ['ada'], view: 'visible' },
            { id: 'c4', body: 'Flat reply', depth: 4, parent_id: 'c3', mentions: [], view: 'visible' },
          ],
        }}
      />,
    );

    const nested = screen.getByText('Nested reply');
    expect(nested.closest('[data-flat]')).toBeNull();
    expect(nested.closest('li')?.parentElement?.closest('li')?.textContent).toContain('Top comment');
    expect(screen.getByText('@ada')).toBeTruthy();
    expect(screen.getByText('Flat reply').closest('[data-flat="true"]')).toBeTruthy();
  });

  it('updates the like count from a live event and ignores a view event', async () => {
    const { QueryClient } = await import('@tanstack/react-query');
    const client = new QueryClient();
    const key = ['article', published.id] as const;
    client.setQueryData(key, published);
    writeArticleCache(client, key, { event_type: 'engagement.article.liked', like_count: 3 });
    writeArticleCache(client, key, { event_type: 'engagement.article.viewed', view_count: 99 });
    const next = client.getQueryData<ArticlePayload>(key);
    expect(next?.like_count).toBe(3);
    expect(next?.view_count).toBe(9);

    render(<ArticleScreen locale="en" status="live" article={next ?? published} />);
    expect(screen.getByText('Likes 3')).toBeTruthy();
    expect(screen.getByText('Views 9')).toBeTruthy();
  });

  it('toasts when a comment is blocked and refuses an empty comment', async () => {
    const user = userEvent.setup();
    const on_comment = vi.fn();
    render(
      <ArticleScreen
        locale="en"
        status="comment-blocked"
        article={published}
        error_code="COMMENT_ARTICLE_NOT_VISIBLE"
        on_comment={on_comment}
      />,
    );

    expect(await screen.findByText('Comments are only allowed on a published article that readers can still see')).toBeTruthy();
    expect(screen.getByText('The published text')).toBeTruthy();

    await user.clear(screen.getByRole('textbox', { name: 'Comment' }));
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(on_comment).not.toHaveBeenCalled();
    expect(await screen.findByText('A comment needs text')).toBeTruthy();
  });

  it('raises and lowers the like count', async () => {
    const user = userEvent.setup();
    const on_like = vi.fn();
    const { rerender } = render(<ArticleScreen locale="en" status="default" article={published} on_like={on_like} />);
    await user.click(screen.getByRole('button', { name: 'Like' }));
    expect(on_like).toHaveBeenCalledOnce();

    const liked = applyArticleLive(published, { event_type: 'engagement.article.liked', like_count: 3 });
    rerender(<ArticleScreen locale="en" status="liked" article={{ ...liked, liked_by_viewer: true }} on_like={on_like} />);
    expect(screen.getByText('Likes 3')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Unlike' }));
    expect(on_like).toHaveBeenCalledTimes(2);
  });

  it('sends a view after three seconds on screen', () => {
    vi.useFakeTimers();
    const on_view = vi.fn();
    render(<ArticleScreen locale="en" status="default" article={published} on_view={on_view} />);
    vi.advanceTimersByTime(2999);
    expect(on_view).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(on_view).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
