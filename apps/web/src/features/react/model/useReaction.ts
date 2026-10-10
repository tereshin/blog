import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { articleKeys, mapFeedCards } from '@/entities/article'
import { commentKeys } from '@/entities/comment'
import type { CommentNode } from '@/entities/comment'
import type { ArticleLoad, ArticleViewerState } from '@/entities/article'
import { applyReactionChange } from '@/entities/reaction'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'
import { profileKeys } from '@/entities/profile'
import { useViewer } from '@/entities/session'
import { ApiError, http, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'

const responseSchema = z.object({
  reaction_counts: z.object({ laugh: z.number(), heart: z.number(), thumb: z.number(), fire: z.number() }),
  reaction_count: z.number(),
  my_reaction: z.enum(['laugh', 'heart', 'thumb', 'fire']).nullable(),
})

export type ReactionTarget = {
  target_type: 'article' | 'comment'
  target_id: string
  /** Адрес статьи в кэше детальной карточки. Для комментария — адрес статьи, к которой он относится. */
  slug: string
  counts: ReactionCounts
  my_reaction: ReactionKind | null
}

type ReactionSnapshot = { counts: ReactionCounts; my_reaction: ReactionKind | null; reaction_count: number }

function patchCommentNode(node: CommentNode, comment_id: string, next: ReactionSnapshot): CommentNode {
  const replies = node.replies.map((reply) => patchCommentNode(reply, comment_id, next))
  if (node.id !== comment_id) return { ...node, replies }
  return { ...node, replies, reaction_counts: next.counts, reaction_count: next.reaction_count, my_reaction: next.my_reaction }
}

function patchCommentCache(data: unknown, comment_id: string, next: ReactionSnapshot): unknown {
  if (!data || typeof data !== 'object' || !('pages' in data)) return data
  const cache = data as { pages: { comments: CommentNode[] }[] }
  if (!Array.isArray(cache.pages)) return data
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      comments: Array.isArray(page.comments) ? page.comments.map((comment) => patchCommentNode(comment, comment_id, next)) : page.comments,
    })),
  }
}

function patchCaches(queryClient: QueryClient, target: ReactionTarget, next: ReactionSnapshot): void {
  if (target.target_type === 'article') {
    queryClient.setQueriesData({ queryKey: profileKeys.all, predicate: (query) => query.queryKey[2] === 'articles' }, (data) =>
      mapFeedCards(data, (card) => (card.id === target.target_id ? { ...card, reaction_counts: next.counts, reaction_count: next.reaction_count } : card)),
    )
  }
  queryClient.setQueriesData({ queryKey: articleKeys.lists() }, (data) =>
    mapFeedCards(data, (card) => (card.id === target.target_id ? { ...card, reaction_counts: next.counts, reaction_count: next.reaction_count } : card)),
  )
  queryClient.setQueryData<ArticleLoad>(articleKeys.detail(target.slug), (data) => {
    if (!data || data.status !== 'ok' || data.article.id !== target.target_id) return data
    return { ...data, article: { ...data.article, reaction_counts: next.counts, reaction_count: next.reaction_count } }
  })
  queryClient.setQueriesData<{ [id: string]: ArticleViewerState } | Record<string, ArticleViewerState>>({ queryKey: [...articleKeys.all, 'states'] }, (data) => {
    if (!data) return data
    const current = data[target.target_id]
    return { ...data, [target.target_id]: { my_reaction: next.my_reaction, is_bookmarked: current?.is_bookmarked ?? false } }
  })
  if (target.target_type === 'comment') {
    queryClient.setQueriesData({ queryKey: commentKeys.all }, (data) => patchCommentCache(data, target.target_id, next))
  }
}

/** Мутация реакции: мгновенно меняет числа в ленте и откатывает их, если сервер отказал. */
export function useReaction(target: ReactionTarget): { react: (kind: ReactionKind) => void; is_pending: boolean } {
  const queryClient = useQueryClient()
  const { viewer } = useViewer()
  const toast = useToast()
  const { t } = useT()
  const mutation = useMutation({
    mutationFn: (kind: ReactionKind) =>
      http.post('/v1/reactions', responseSchema, { body: { target_type: target.target_type, target_id: target.target_id, kind } }),
    onMutate: async (kind) => {
      await queryClient.cancelQueries({ queryKey: articleKeys.all })
      await queryClient.cancelQueries({ queryKey: commentKeys.all })
      await queryClient.cancelQueries({ queryKey: profileKeys.all, predicate: (query) => query.queryKey[2] === 'articles' })
      const previous_profiles = queryClient.getQueriesData({ queryKey: profileKeys.all, predicate: (query) => query.queryKey[2] === 'articles' })
      const previous = queryClient.getQueriesData({ queryKey: articleKeys.all })
      const previous_comments = queryClient.getQueriesData({ queryKey: commentKeys.all })
      patchCaches(queryClient, target, applyReactionChange(target.counts, target.my_reaction, kind))
      return { previous, previous_comments, previous_profiles }
    },
    onError: (error, _kind, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data)
      for (const [key, data] of context?.previous_profiles ?? []) queryClient.setQueryData(key, data)
      for (const [key, data] of context?.previous_comments ?? []) queryClient.setQueryData(key, data)
      const restricted = error instanceof ApiError && error.code === 'restricted'
      toast.error(restricted ? t('reaction.restricted') : t('reaction.failed'))
    },
    onSuccess: (response) => {
      patchCaches(queryClient, target, {
        counts: response.reaction_counts,
        reaction_count: response.reaction_count,
        my_reaction: response.my_reaction,
      })
      if (target.target_type === 'comment') void queryClient.invalidateQueries({ queryKey: commentKeys.all })
    },
  })

  return {
    is_pending: mutation.isPending,
    react: (kind) => {
      if (viewer.status === 'guest') {
        sessionEvents.emit('login_required')
        return
      }
      if (viewer.status !== 'member') return
      if (viewer.user.is_restricted) {
        toast.error(t('reaction.restricted'))
        return
      }
      if (!viewer.user.email_verified) {
        toast.error(t('login.email_unverified'))
        return
      }
      mutation.mutate(kind)
    },
  }
}
