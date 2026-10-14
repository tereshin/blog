import type { ReactNode } from 'react'
import { ArticleCardExpand } from '@/entities/article'
import { useArticleExpand } from '../model/useArticleExpand.ts'

type FeedArticleExpandProps = {
  slug: string
  has_more_content?: boolean
  onExpanded?: (article_id: string) => void
  children?: ReactNode
}

export function FeedArticleExpand({ slug, has_more_content = true, onExpanded, children }: FeedArticleExpandProps) {
  const expand = useArticleExpand(slug, onExpanded)
  return (
    <ArticleCardExpand
      has_more_content={has_more_content}
      is_open={expand.is_open}
      is_pending={expand.is_pending}
      is_error={expand.is_error}
      load={expand.load}
      article={expand.article}
      onToggle={expand.handleToggle}
    >
      {children}
    </ArticleCardExpand>
  )
}
