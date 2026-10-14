export const moderationKeys = {
  all: ['moderation'] as const,
  list: (filter: string, filters?: object) => [...moderationKeys.all, filter, filters] as const,
  reports: (filters?: object) => [...moderationKeys.all, 'comment-reports', filters] as const,
}
