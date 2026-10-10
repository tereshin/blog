import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { commentKeys, createComment } from '@/entities/comment'
import type { CommentNode } from '@/entities/comment'
import { useViewer } from '@/entities/session'
import { ApiError } from '@/shared/api'
import { formatTime } from '@/shared/lib'
import type { CommentCache } from './comment-cache.ts'
import { insertComment, replaceComment } from './comment-cache.ts'

type Extras = {
  media?: { url: string; alt: string }[]
  mentions?: { user_id: string; display_name: string }[]
}
type SendInput = Extras & { body: string; parent_id: string | null; idempotency_key: string }

function pendingComment(input: SendInput, author: CommentNode['author']): CommentNode {
  const created_at = new Date().toISOString()
  return {
    id: `pending-${input.idempotency_key}`,
    author,
    body: input.body,
    media: input.media ?? [],
    mentions: input.mentions ?? [],
    reply_count: 0,
    is_bookmarked: false,
    status: 'pending',
    edited_at: null,
    reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
    reaction_count: 0,
    my_reaction: null,
    created_at,
    time_label: formatTime(created_at, new Date()),
    replies: [],
  }
}

/** Отправка комментария: строка появляется сразу, при ошибке текст остаётся в форме. */
export function useSendComment(
  article_id: string,
  onSuccess?: (parent_id: string | null) => void,
): {
  send: (body: string, parent_id: string | null, extras?: Extras) => void
  is_pending: boolean
  error: string | null
} {
  const queryClient = useQueryClient()
  const { viewer } = useViewer()
  const key_ref = useRef<{ key: string; fingerprint: string } | null>(null)
  const on_success_ref = useRef(onSuccess)
  useEffect(() => {
    on_success_ref.current = onSuccess
  })
  const mutation = useMutation({
    mutationFn: (input: SendInput) =>
      createComment(
        article_id,
        {
          body: input.body,
          media: input.media ?? [],
          mentions: input.mentions ?? [],
          ...(input.parent_id ? { parent_id: input.parent_id } : {}),
        },
        input.idempotency_key,
      ),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(article_id) })
      const previous = queryClient.getQueriesData<CommentCache>({
        queryKey: commentKeys.list(article_id),
      })
      if (viewer.status !== 'member') return { previous }
      const optimistic = pendingComment(input, {
        user_id: viewer.user.id,
        display_name: viewer.profile.display_name,
        avatar_url: viewer.profile.avatar_url,
      })
      for (const [key, cache] of previous) {
        if (!cache) continue
        if (key[3] === 'replies') {
          if (key[4] === input.parent_id)
            queryClient.setQueryData(key, insertComment(cache, optimistic, null))
        } else queryClient.setQueryData(key, insertComment(cache, optimistic, input.parent_id))
      }
      return { previous, optimistic_id: optimistic.id }
    },
    onError: (_error, _input, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data)
    },
    onSuccess: (comment, input, context) => {
      key_ref.current = null
      queryClient.setQueriesData<CommentCache>(
        { queryKey: commentKeys.list(article_id) },
        (cache) =>
          cache && context?.optimistic_id
            ? replaceComment(cache, context.optimistic_id, comment)
            : cache,
      )
      void queryClient.invalidateQueries({ queryKey: commentKeys.all })
      on_success_ref.current?.(input.parent_id)
    },
  })

  return {
    is_pending: mutation.isPending,
    error:
      mutation.error instanceof ApiError
        ? mutation.error.message
        : mutation.error
          ? mutation.error.message
          : null,
    send: (body, parent_id, extras = {}) => {
      const fingerprint = JSON.stringify({ body, parent_id, ...extras })
      const idempotency_key =
        key_ref.current?.fingerprint === fingerprint ? key_ref.current.key : crypto.randomUUID()
      key_ref.current = { key: idempotency_key, fingerprint }
      mutation.mutate({ body, parent_id, idempotency_key, ...extras })
    },
  }
}
