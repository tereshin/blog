'use client';

import { useState } from 'react';
import { ArticleScreen, applyArticleLive, type ArticlePayload } from './article-screen';

export function ArticlePreview({ article }: { article: ArticlePayload }) {
  const [current, set_current] = useState(article);

  return (
    <ArticleScreen
      locale="en"
      status={current.view === 'author' ? 'author' : current.view === 'unavailable' ? 'unavailable' : 'default'}
      article={current}
      on_like={() => {
        const like_count = current.liked_by_viewer ? current.like_count - 1 : current.like_count + 1;
        const event_type = current.liked_by_viewer ? 'engagement.article.unliked' : 'engagement.article.liked';
        set_current({
          ...applyArticleLive(current, { event_type, like_count }),
          liked_by_viewer: !current.liked_by_viewer,
        });
      }}
      on_comment={(body) => {
        set_current(
          applyArticleLive(current, {
            event_type: 'comments.comment.created',
            comment_id: `local-${current.comments.length + 1}`,
            body,
          }),
        );
      }}
    />
  );
}
