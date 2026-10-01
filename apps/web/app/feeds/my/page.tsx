import { MyFeedScreen } from '../../../src/features/library/my-feed-screen';
import type { FeedArticle } from '../../../src/features/feeds/feed-screen';

const followed: FeedArticle = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  slug: 'from-ada',
  title: 'From Ada',
  language: 'en',
  published_at: '2026-09-30T01:00:00Z',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
};

const older: FeedArticle = {
  ...followed,
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a2',
  slug: 'from-topic',
  title: 'From the topic',
  language: 'ru',
  published_at: '2026-09-30T00:00:00Z',
};

export default async function MyFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ signed_in?: string; state?: string }>;
}) {
  const params = await searchParams;
  const signed_in = params.signed_in === '1';
  const empty = params.state === 'empty';

  return (
    <MyFeedScreen
      locale="en"
      status={empty ? 'empty' : 'default'}
      signed_in={signed_in}
      page={{ items: empty ? [] : [followed, older], has_next: false, has_prev: false, next_cursor: null }}
    />
  );
}
