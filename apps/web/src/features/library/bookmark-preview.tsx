'use client';

import { useState } from 'react';
import type { FeedArticle } from '../feeds/feed-screen';
import { BookmarkScreen } from './bookmark-screen';

export function GuestBookmarks() {
  return <BookmarkScreen locale="en" status="default" signed_in={false} items={[]} on_remove={() => undefined} />;
}

export function BookmarkPreview({ items }: { items: FeedArticle[] }) {
  const [bookmarks, set_bookmarks] = useState(items);

  return (
    <BookmarkScreen
      locale="en"
      status={bookmarks.length === 0 ? 'empty' : 'default'}
      signed_in
      items={bookmarks}
      on_remove={(article_id) => set_bookmarks(bookmarks.filter((item) => item.id !== article_id))}
    />
  );
}
