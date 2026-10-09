import { useInfiniteQuery } from '@tanstack/react-query'
import { getMessages } from '../api/get-messages.ts'
import type { MessageModel, MessagePageModel } from '../api/conversation-schema.ts'
import { conversationKeys } from './conversation-keys.ts'

export type MessagesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; refetch: () => void }
  | { status: 'empty' }
  | { status: 'ok'; items: MessageModel[]; has_next: boolean; fetchNext: () => void }

/** Страницы приходят от новых к старым; на экране порядок хронологический. */
function chronological(pages: readonly MessagePageModel[]): MessageModel[] {
  const seen = new Set<string>()
  const newest_first: MessageModel[] = []
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      newest_first.push(item)
    }
  }
  return newest_first.reverse()
}

export function useMessages(conversation_id: string | null): MessagesState {
  const query = useInfiniteQuery({
    queryKey: conversationKeys.messages(conversation_id ?? 'none'),
    queryFn: ({ pageParam, signal }) => getMessages(conversation_id ?? '', pageParam, signal),
    enabled: conversation_id !== null,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })

  if (conversation_id === null) return { status: 'idle' }
  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', refetch: () => void query.refetch() }
  const items = chronological(query.data.pages)
  if (items.length === 0) return { status: 'empty' }
  return { status: 'ok', items, has_next: query.hasNextPage, fetchNext: () => void query.fetchNextPage() }
}
