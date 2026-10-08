export const commentKeys = {
  all: ['comments'] as const,
  popular: () => [...commentKeys.all, 'popular'] as const,
  list: (article_id: string) => [...commentKeys.all, 'list', article_id] as const,
  byAuthor: (user_id: string, sort: string) => [...commentKeys.all, 'author', user_id, sort] as const,
}
