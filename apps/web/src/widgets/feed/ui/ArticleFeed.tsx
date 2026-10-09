import { ArticleCardExpand } from '@/entities/article'
import type { FeedMode } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { BookmarkControl } from '@/features/bookmark'
import { OwnArticleMenu } from '@/features/manage-article'
import { ReactionControl } from '@/features/react'
import { Feed } from './Feed.tsx'

/** Лента со слотами реакций, закладок, раскрытия и меню своей статьи. */
export function ArticleFeed({ mode }: { mode: FeedMode }) {
  const { is_own } = useViewer()
  return (
    <Feed
      mode={mode}
      renderReactions={(article, viewer_state) => (
        <ReactionControl
          target_type="article"
          target_id={article.id}
          slug={article.slug}
          counts={article.reaction_counts}
          my_reaction={viewer_state.my_reaction}
        />
      )}
      renderBookmark={(article, viewer_state) => (
        <BookmarkControl article_id={article.id} slug={article.slug} count={article.bookmark_count} is_bookmarked={viewer_state.is_bookmarked} />
      )}
      renderExpand={(article) => <ArticleCardExpand slug={article.slug} />}
      renderMenu={(article) => (is_own(article.author.user_id) ? <OwnArticleMenu article_id={article.id} /> : null)}
    />
  )
}
