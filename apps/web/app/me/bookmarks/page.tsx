import { BookmarkPreview, GuestBookmarks } from '../../../src/features/library/bookmark-preview';
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

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ signed_in?: string }>;
}) {
  const params = await searchParams;

  if (params.signed_in !== '1') {
    return <GuestBookmarks />;
  }

  return <BookmarkPreview items={[followed]} />;
}
