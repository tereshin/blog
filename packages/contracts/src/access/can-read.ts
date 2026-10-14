export type ArticleVisibility = 'public' | 'members' | 'author'
export type ArticleStatus = 'draft' | 'published' | 'hidden' | 'deleted'

export type ArticleAccessFields = {
  author_id: string
  visibility: ArticleVisibility
  status: ArticleStatus
}
