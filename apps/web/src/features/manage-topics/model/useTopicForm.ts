import { useState } from 'react'
import { useNavigate } from 'react-router'
import { TOPIC_SLUG_PATTERN } from '@blog/contracts'
import type { Topic } from '@/entities/topic'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useManageTopics } from './useManageTopics.ts'
import type { TopicDraft } from '../api/manage-topics.ts'

export function useTopicForm(initial: Topic | undefined, onSaved: (topic: Topic) => void) {
  const { t } = useT()
  const navigate = useNavigate()
  const { create, update } = useManageTopics()
  const [draft, setDraft] = useState<TopicDraft & { status: 'active' | 'archived' }>(() => ({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    slug: initial?.slug ?? '',
    avatar_url: initial?.avatar_url ?? null,
    cover_url: initial?.cover_url ?? null,
    status: initial?.status ?? 'active',
  }))
  const [error, setError] = useState<string | null>(null)
  const is_pending = create.isPending || update.isPending
  const save = () => {
    if (is_pending) return
    setError(null)
    if (!draft.title.trim() || !TOPIC_SLUG_PATTERN.test(draft.slug.trim())) {
      setError(t('profile.error.invalid'))
      return
    }
    const body = {
      ...draft,
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      description: draft.description?.trim() || null,
    }
    const callbacks = {
      onSuccess: (topic: Topic) => {
        onSaved(topic)
        if (!initial || initial.slug !== topic.slug)
          navigate(`/t/${encodeURIComponent(topic.slug)}`)
      },
      onError: (reason: Error) => {
        setError(
          reason instanceof ApiError && reason.code === 'slug_taken'
            ? t('admin.topics.slug_taken')
            : reason instanceof ApiError && reason.code === 'slug_reserved'
              ? t('admin.topics.slug_reserved')
              : t('admin.topics.error'),
        )
      },
    }
    if (initial) void update.mutateAsync({ id: initial.id, body }).then(callbacks.onSuccess, callbacks.onError)
    else
      void create.mutateAsync(
        {
          title: body.title,
          description: body.description,
          slug: body.slug,
          avatar_url: body.avatar_url,
          cover_url: body.cover_url,
        },
      ).then(callbacks.onSuccess, callbacks.onError)
  }
  return { draft, setDraft, error, is_pending, save }
}
