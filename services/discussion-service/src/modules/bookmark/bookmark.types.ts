import type { ArticleAccessFields, BookmarkPage, BookmarkState, ServiceContext } from '@blog/contracts'

export type BookmarkArticle = ArticleAccessFields & { article_id: string }

export type BookmarkRepository = {
  findArticle: (article_id: string) => Promise<BookmarkArticle | null>
  setBookmarked: (input: { user_id: string; article_id: string; bookmarked: boolean; correlation_id: string }) => Promise<BookmarkState>
  list: (user_id: string, cursor: { t: string; id: string } | null, limit: number) => Promise<{ article_id: string; created_at: Date }[]>
}

export type BookmarkService = {
  put: (viewer: ServiceContext, article_id: string, correlation_id: string) => Promise<BookmarkState>
  remove: (viewer: ServiceContext, article_id: string, correlation_id: string) => Promise<BookmarkState>
  list: (viewer: ServiceContext, query: { cursor?: string; limit: number }) => Promise<BookmarkPage>
}
