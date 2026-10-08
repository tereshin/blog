import { createContext, use } from 'react'
import type { ArticleModel } from '@/entities/article'

export const ArticleViewContext = createContext<ArticleModel | null>(null)

export function useArticleViewModel(): ArticleModel {
  const article = use(ArticleViewContext)
  if (!article) throw new Error('Часть ArticleView использована вне <ArticleView>')
  return article
}
