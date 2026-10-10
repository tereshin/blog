import { ArticleCardExpand } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { BookmarkControl } from '@/features/bookmark'
import { FollowButton } from '@/features/follow'
import { ShareButton } from '@/features/share-article'
import { ReactionControl } from '@/features/react'
import { ArticleOverflowMenu } from './ArticleOverflowMenu.tsx'

import type { FeedSlots } from './FeedItem.tsx'

export function useArticleFeedSlots(): FeedSlots {
  const { is_own } = useViewer()
  return {
    renderReactions: (article, viewer_state) => (
      <ReactionControl
        target_type="article"
        target_id={article.id}
        slug={article.slug}
        counts={article.reaction_counts}
        my_reaction={viewer_state.my_reaction}
      />
    ),
    renderBookmark: (article, viewer_state) => (
      <BookmarkControl
        article_id={article.id}
        slug={article.slug}
        count={article.bookmark_count}
        is_bookmarked={viewer_state.is_bookmarked}
      />
    ),
    renderShare: (article) => <ShareButton slug={article.slug} />,
    renderFollow: (article) => (
      <FollowButton
        target_type="user"
        target_id={article.author.user_id}
        is_following={article.is_following ?? false}
        is_own={is_own(article.author.user_id)}
      />
    ),
    renderExpand: (article, onExpanded) => (
      <ArticleCardExpand slug={article.slug} onExpanded={onExpanded} />
    ),
    renderMenu: (article) => (
      <ArticleOverflowMenu
        article_id={article.id}
        slug={article.slug}
        is_own={is_own(article.author.user_id)}
      />
    ),
  }
}
