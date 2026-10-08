import { createContext, use } from 'react'
import type { ArticleCardModel } from '../model/article-types.ts'

export const ArticleCardContext = createContext<ArticleCardModel | null>(null)

/** Части `ArticleCard` берут статью из корня; вне карточки они не используются. */
export function useArticleCardModel(): ArticleCardModel {
  const article = use(ArticleCardContext)
  if (!article) throw new Error('Часть ArticleCard использована вне <ArticleCard>')
  return article
}
