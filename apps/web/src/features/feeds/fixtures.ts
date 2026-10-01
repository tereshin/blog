import type { FeedPageData } from './feed-screen';

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
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a2',
  slug: 'older-essay',
  title: 'Older essay',
  language: 'ru',
  published_at: '2026-09-30T00:00:00Z',
  author_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
};

export const fresh_fixture: FeedPageData = {
  items: [newer, older],
  has_next: false,
  has_prev: false,
  next_cursor: null,
};

export const popular_fixture: FeedPageData = {
  items: [older, newer],
  has_next: false,
  has_prev: false,
  next_cursor: null,
};
