export const commentKeys = {
  all: ['comments'] as const,
  popular: () => [...commentKeys.all, 'popular'] as const,
  list: (article_id: string) => [...commentKeys.all, 'list', article_id] as const,
  sorted: (article_id: string, sort: string) => [...commentKeys.list(article_id), sort] as const,
  replies: (article_id: string, root_id: string, sort: string) =>
    [...commentKeys.list(article_id), 'replies', root_id, sort] as const,
  thread: (id: string) => [...commentKeys.all, 'thread', id] as const,
  bookmarks: () => [...commentKeys.all, 'bookmarks'] as const,
  reactors: (id: string, kind: string) => [...commentKeys.all, 'reactors', id, kind] as const,
  subscription: (id: string) => [...commentKeys.all, 'subscription', id] as const,
  byAuthor: (user_id: string, sort: string) =>
    [...commentKeys.all, 'author', user_id, sort] as const,
}
