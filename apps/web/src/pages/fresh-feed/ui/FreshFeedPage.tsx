import { useEffect } from 'react'
import { ArticleCardExpand } from '@/entities/article'
import { BookmarkControl } from '@/features/bookmark'
import { ReactionControl } from '@/features/react'
import { Feed } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'

// Страница — только композиция: лента «Свежее», реакции, закладки и раскрытие внутри карточки.
export default function FreshFeedPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])

  return (
    <Feed
      mode="fresh"
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
    />
  )
}
