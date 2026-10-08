export const topicKeys = {
  all: ['topics'] as const,
  list: () => [...topicKeys.all, 'list'] as const,
  admin: () => [...topicKeys.all, 'admin'] as const,
  detail: (slug: string) => [...topicKeys.all, 'detail', slug] as const,
}
