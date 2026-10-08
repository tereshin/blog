export const profileKeys = {
  all: ['profile'] as const,
  detail: (slug: string) => [...profileKeys.all, slug] as const,
  articles: (slug: string, sort: string) => [...profileKeys.all, slug, 'articles', sort] as const,
  people: (slug: string, kind: 'followers' | 'following') => [...profileKeys.all, slug, kind] as const,
  stats: () => [...profileKeys.all, 'stats'] as const,
  rating: () => [...profileKeys.all, 'rating'] as const,
}
