import type { FeedMode } from './article-types.ts'

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (mode: FeedMode) => [...articleKeys.lists(), mode] as const,
  detail: (slug: string) => [...articleKeys.all, 'detail', slug] as const,
  /** Состояния зрителя (своя реакция, закладка) по набору статей. */
  states: (ids: readonly string[]) => [...articleKeys.all, 'states', [...ids].sort()] as const,
  draft: (id: string) => [...articleKeys.all, 'draft', id] as const,
  myDrafts: () => [...articleKeys.all, 'my-drafts'] as const,
  bookmarks: () => [...articleKeys.all, 'bookmarks'] as const,
}
