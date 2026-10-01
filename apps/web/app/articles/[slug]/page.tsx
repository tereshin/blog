import { ArticlePreview } from '../../../src/features/article/article-preview';
import type { ArticlePayload } from '../../../src/features/article/article-screen';

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
    {
      id: '018f3c2a-7b10-7c3e-8f21-0000000000e2',
      body: 'Nested reply',
      depth: 2,
      parent_id: '018f3c2a-7b10-7c3e-8f21-0000000000e1',
      mentions: ['ada'],
      view: 'visible',
    },
    {
      id: '018f3c2a-7b10-7c3e-8f21-0000000000e4',
      body: 'Flat reply',
      depth: 4,
      parent_id: '018f3c2a-7b10-7c3e-8f21-0000000000e3',
      mentions: [],
      view: 'visible',
    },
  ],
};

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  if (slug === 'missing') {
    return (
      <ArticlePreview
        article={{ ...published, view: 'not-found', title: undefined, rendered_html: undefined, images: [] }}
      />
    );
  }

  if (query.state === 'unavailable') {
    return (
      <ArticlePreview
        article={{ ...published, view: 'unavailable', title: undefined, rendered_html: undefined, images: [] }}
      />
    );
  }

  if (query.state === 'author') {
    return <ArticlePreview article={{ ...published, view: 'author', status: 'draft', is_author: true, images: [] }} />;
  }

  return <ArticlePreview article={published} />;
}
