export const moderationKeys = {
  all: ['moderation'] as const,
  list: (filter: 'reported' | 'hidden') => [...moderationKeys.all, filter] as const,
}
