export const userKeys = {
  followers: (slug: string) => ['users', 'followers', slug] as const,
  following: (slug: string) => ['users', 'following', slug] as const,
  rating: (limit = 20) => ['users', 'rating', limit] as const,
}