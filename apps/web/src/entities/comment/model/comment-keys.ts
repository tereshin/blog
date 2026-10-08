export const commentKeys = {
  all: ['comments'] as const,
  popular: () => [...commentKeys.all, 'popular'] as const,
  list: (article_id: string) => [...commentKeys.all, 'list', article_id] as const,
}
