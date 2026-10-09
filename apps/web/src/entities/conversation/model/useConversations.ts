import { useInfiniteQuery } from '@tanstack/react-query'
import { getConversations } from '../api/get-conversations.ts'
import type { ConversationModel } from '../api/conversation-schema.ts'
import { conversationKeys } from './conversation-keys.ts'

export type ConversationsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; refetch: () => void }
  | { status: 'empty' }
  | { status: 'ok'; items: ConversationModel[]; has_next: boolean; fetchNext: () => void }

/** Свои диалоги. Гость запрос не делает. */
export function useConversations(enabled: boolean): ConversationsState {
  const query = useInfiniteQuery({
    queryKey: conversationKeys.list(),
    queryFn: ({ pageParam, signal }) => getConversations(pageParam, signal),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })

  if (!enabled) return { status: 'idle' }
  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', refetch: () => void query.refetch() }
  const items = query.data.pages.flatMap((page) => page.items)
  if (items.length === 0) return { status: 'empty' }
  return { status: 'ok', items, has_next: query.hasNextPage, fetchNext: () => void query.fetchNextPage() }
}
