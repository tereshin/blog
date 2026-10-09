import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { conversationKeys, sendMessage } from '@/entities/conversation'
import type { MessageModel } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { ApiError } from '@/shared/api'
import { formatTime } from '@/shared/lib'

type MessagePageCache = { items: MessageModel[]; next_cursor: string | null }
type SendInput = { body: string; idempotency_key: string }

type UseSendMessageOptions = {
  conversation_id: string | null
  peer_user_id: string | null
  onSent?: (message: MessageModel) => void
}

function prepend(data: InfiniteData<MessagePageCache> | undefined, message: MessageModel): InfiniteData<MessagePageCache> {
  const first = data?.pages[0]
  const page = first
    ? { ...first, items: [message, ...first.items.filter((item) => item.id !== message.id)] }
    : { items: [message], next_cursor: null }
  return {
    pages: [page, ...(data?.pages.slice(1) ?? [])],
    pageParams: data?.pageParams ?? [undefined],
  }
}

function replaceOptimistic(data: InfiniteData<MessagePageCache> | undefined, pending_id: string, message: MessageModel): InfiniteData<MessagePageCache> | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === pending_id ? message : item)),
    })),
  }
}

/** Отправка: строка появляется сразу, при ошибке текст остаётся, повтор идёт с тем же ключом. */
export function useSendMessage({ conversation_id, peer_user_id, onSent }: UseSendMessageOptions): {
  send: (body: string) => void
  is_pending: boolean
  error: string | null
  error_code: string | null
} {
  const query_client = useQueryClient()
  const { viewer } = useViewer()
  const key_ref = useRef<string | null>(null)
  const on_sent_ref = useRef(onSent)
  useEffect(() => {
    on_sent_ref.current = onSent
  })

  const mutation = useMutation({
    mutationFn: (input: SendInput) => {
      if (!peer_user_id) return Promise.reject(new ApiError({ code: 'validation_failed', status: 422, message: 'Не выбран собеседник' }))
      return sendMessage(peer_user_id, { body: input.body }, input.idempotency_key)
    },
    onMutate: async (input) => {
      if (!conversation_id || viewer.status !== 'member') return {}
      const key = conversationKeys.messages(conversation_id)
      await query_client.cancelQueries({ queryKey: key })
      const previous = query_client.getQueryData<InfiniteData<MessagePageCache>>(key)
      const created_at = new Date().toISOString()
      const optimistic: MessageModel = {
        id: `pending-${input.idempotency_key}`,
        conversation_id,
        sender_id: viewer.user.id,
        body: input.body,
        created_at,
        read_at: null,
        time_label: formatTime(created_at),
      }
      query_client.setQueryData<InfiniteData<MessagePageCache>>(key, (cache) => prepend(cache, optimistic))
      return { previous, optimistic_id: optimistic.id }
    },
    onError: (_error, _input, context) => {
      if (!conversation_id || !context || !('previous' in context)) return
      if (context.previous) query_client.setQueryData(conversationKeys.messages(conversation_id), context.previous)
      else void query_client.removeQueries({ queryKey: conversationKeys.messages(conversation_id), exact: true })
    },
    onSuccess: (message, _input, context) => {
      key_ref.current = null
      const pending_id = context?.optimistic_id
      if (conversation_id && pending_id) {
        query_client.setQueryData<InfiniteData<MessagePageCache>>(conversationKeys.messages(conversation_id), (cache) =>
          replaceOptimistic(cache, pending_id, message),
        )
      }
      void query_client.invalidateQueries({ queryKey: conversationKeys.list() })
      void query_client.invalidateQueries({ queryKey: conversationKeys.unread() })
      on_sent_ref.current?.(message)
    },
  })

  const error = mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? mutation.error.message : null
  return {
    is_pending: mutation.isPending,
    error,
    error_code: mutation.error instanceof ApiError ? mutation.error.code : null,
    send: (body) => {
      if (!peer_user_id) return
      const idempotency_key = key_ref.current ?? crypto.randomUUID()
      key_ref.current = idempotency_key
      mutation.mutate({ body, idempotency_key })
    },
  }
}
