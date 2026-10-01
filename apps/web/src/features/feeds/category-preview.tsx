'use client';

import { useState } from 'react';
import { CategoryScreen } from './category-screen';

export function MissingCategory({ slug }: { slug: string }) {
  return (
    <CategoryScreen
      status="not-found"
      locale="en"
      name=""
      slug={slug}
      following={false}
      on_follow={() => undefined}
      on_unfollow={() => undefined}
    />
  );
}

export function CategoryPreview({ name, slug }: { name: string; slug: string }) {
  const [following, set_following] = useState(false);

  return (
    <CategoryScreen
      status={following ? 'following' : 'default'}
      locale="en"
      name={name}
      slug={slug}
      following={following}
      on_follow={() => set_following(true)}
      on_unfollow={() => set_following(false)}
    />
  );
}
