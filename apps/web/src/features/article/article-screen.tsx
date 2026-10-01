'use client';

import { translate, type Locale } from '@blog/i18n';
import { article_catalog } from '@blog/i18n/features/article';
import type { QueryClient } from '@tanstack/react-query';
import { Button, Skeleton, Toast, toast } from '@heroui/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../shared/empty-state';

export type ArticleComment = {
  id: string;
  body: string;
  depth: number;
  parent_id: string | null;
  mentions: string[];
  view: 'visible' | 'unavailable';
};

export type ArticlePayload = {
  view: 'published' | 'unavailable' | 'author' | 'not-found';
  id: string;
  title?: string;
  rendered_html?: string;
  images?: Array<{ media_id: string; url: string }>;
  status?: string;
  removed_by?: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  liked_by_viewer?: boolean;
  is_author?: boolean;
  comments: ArticleComment[];
};

export type LiveArticleEvent =
  | { event_type: 'engagement.article.liked' | 'engagement.article.unliked'; like_count: number }
  | { event_type: 'engagement.article.viewed'; view_count: number }
  | { event_type: 'comments.comment.created'; comment_id: string; body?: string; depth?: number }
  | { event_type: 'comments.comment.hidden'; comment_id: string }
  | { event_type: 'content.article.hidden' | 'content.article.soft_removed' };

export const view_delay_ms = 3000;

export function applyArticleLive(article: ArticlePayload, event: LiveArticleEvent): ArticlePayload {
  if (event.event_type === 'engagement.article.viewed') {
    return article;
  }
  if (event.event_type === 'engagement.article.liked' || event.event_type === 'engagement.article.unliked') {
    return { ...article, like_count: event.like_count };
  }
  if (event.event_type === 'comments.comment.created') {
    return {
      ...article,
      comment_count: article.comment_count + 1,
      comments: [
        ...article.comments,
        {
          id: event.comment_id,
          body: event.body ?? '',
          depth: event.depth ?? 1,
          parent_id: null,
          mentions: [],
          view: 'visible',
        },
      ],
    };
  }
  if (event.event_type === 'comments.comment.hidden') {
    return {
      ...article,
      comments: article.comments.map((comment) =>
        comment.id === event.comment_id ? { ...comment, view: 'unavailable', body: '' } : comment,
      ),
    };
  }
  return { ...article, view: 'unavailable', title: undefined, rendered_html: undefined, images: [] };
}

export function writeArticleCache(client: QueryClient, key: readonly unknown[], event: LiveArticleEvent) {
  client.setQueryData<ArticlePayload>(key, (current) => (current ? applyArticleLive(current, event) : current));
}

export function ArticleScreen({
  locale,
  status,
  article,
  error_code,
  on_like,
  on_comment,
  on_view,
}: {
  locale: Locale;
  status: string;
  article: ArticlePayload;
  error_code?: string;
  on_like?: () => void;
  on_comment?: (body: string) => void;
  on_view?: () => void;
}) {
  const blocked =
    error_code === 'COMMENT_ARTICLE_NOT_VISIBLE'
      ? translate(locale, 'article.error.comment_blocked', article_catalog)
      : null;

  useEffect(() => {
    if (article.view !== 'published' || !on_view) {
      return;
    }
    const timer = setTimeout(on_view, view_delay_ms);
    return () => clearTimeout(timer);
  }, [article.id, article.view, on_view]);

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'article.loading', article_catalog)}>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (article.view === 'unavailable' || article.view === 'not-found' || status === 'unavailable') {
    return (
      <main>
        <EmptyState
          title={translate(
            locale,
            article.view === 'not-found' ? 'article.not_found' : 'article.unavailable',
            article_catalog,
          )}
        />
      </main>
    );
  }

  return (
    <>
      <Toast.Provider />
      <Notice message={blocked} />
      <main>
        {article.view === 'author' ? <p>{authorState(locale, article)}</p> : null}
        <ArticleBody article={article} />
        <p>
          {translate(locale, 'article.likes', article_catalog)} {article.like_count}
        </p>
        <p>
          {translate(locale, 'article.comments', article_catalog)} {article.comment_count}
        </p>
        <p>
          {translate(locale, 'article.views', article_catalog)} {article.view_count}
        </p>
        <Button variant="secondary" onPress={on_like}>
          {translate(locale, article.liked_by_viewer ? 'article.unlike' : 'article.like', article_catalog)}
        </Button>
        {article.is_author ? <a href={`/articles/${article.id}/edit`}>{translate(locale, 'article.edit', article_catalog)}</a> : null}
        <CommentThread locale={locale} comments={article.comments} />
        <CommentForm locale={locale} on_comment={on_comment} />
      </main>
    </>
  );
}

function ArticleBody({ article }: { article: ArticlePayload }) {
  return (
    <article>
      <h1>{article.title}</h1>
      {article.rendered_html ? <div dangerouslySetInnerHTML={{ __html: article.rendered_html }} /> : null}
      {article.images?.map((image) => (
        <Image key={image.media_id} src={image.url} alt={article.title ?? ''} width={640} height={360} unoptimized />
      ))}
    </article>
  );
}

function CommentThread({ locale, comments }: { locale: Locale; comments: ArticleComment[] }) {
  const threaded = comments.filter((comment) => comment.depth <= 3);
  const flat = comments.filter((comment) => comment.depth > 3);
  const roots = threaded.filter((comment) => comment.parent_id === null);

  return (
    <ul>
      {roots.map((comment) => (
        <CommentNode key={comment.id} locale={locale} comment={comment} comments={threaded} />
      ))}
      {flat.map((comment) => (
        <li key={comment.id} data-flat="true">
          <CommentBody locale={locale} comment={comment} />
        </li>
      ))}
    </ul>
  );
}

function CommentNode({
  locale,
  comment,
  comments,
}: {
  locale: Locale;
  comment: ArticleComment;
  comments: ArticleComment[];
}) {
  const replies = comments.filter((item) => item.parent_id === comment.id);

  return (
    <li>
      <CommentBody locale={locale} comment={comment} />
      {replies.length > 0 ? (
        <ul>
          {replies.map((reply) => (
            <CommentNode key={reply.id} locale={locale} comment={reply} comments={comments} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CommentBody({ locale, comment }: { locale: Locale; comment: ArticleComment }) {
  if (comment.view === 'unavailable') {
    return <p>{translate(locale, 'article.comment.unavailable', article_catalog)}</p>;
  }

  return (
    <>
      <p>{comment.body}</p>
      {comment.mentions.map((mention) => (
        <span key={mention}>@{mention}</span>
      ))}
    </>
  );
}

function CommentForm({ locale, on_comment }: { locale: Locale; on_comment?: (body: string) => void }) {
  const [body, set_body] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);

  function post() {
    if (body.trim() === '') {
      set_invalid(translate(locale, 'article.error.comment_required', article_catalog));
      return;
    }
    on_comment?.(body);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        post();
      }}
    >
      <Notice message={invalid} />
      <textarea
        aria-label={translate(locale, 'article.comment.label', article_catalog)}
        value={body}
        onChange={(event) => set_body(event.target.value)}
      />
      <Button variant="primary" onPress={post}>
        {translate(locale, 'article.comment.post', article_catalog)}
      </Button>
    </form>
  );
}

function Notice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) {
      return;
    }
    toast.danger(message);
  }, [message]);

  return null;
}

function authorState(locale: Locale, article: ArticlePayload): string {
  if (article.status === 'hidden') {
    return translate(locale, 'article.status.hidden', article_catalog);
  }
  if (article.status === 'soft_removed' && article.removed_by === 'author') {
    return translate(locale, 'article.status.withdrawn', article_catalog);
  }
  if (article.status === 'soft_removed') {
    return translate(locale, 'article.status.staff', article_catalog);
  }
  return translate(locale, 'article.status.draft', article_catalog);
}
