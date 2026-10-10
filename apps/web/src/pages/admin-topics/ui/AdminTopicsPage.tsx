import { useEffect } from 'react'
import { RequireRole } from '@/entities/session'
import { TopicForm, TopicRow, useManageTopics } from '@/features/manage-topics'
import { ImageUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

function TopicsScreen() {
  const { t } = useT()
  const { topics, reorder } = useManageTopics()
  const items = topics.data ?? []

  const move = (id: string, direction: -1 | 1) => {
    const index = items.findIndex((topic) => topic.id === id)
    const next = index + direction
    if (index < 0 || next < 0 || next >= items.length) return
    const ids = items.map((topic) => topic.id)
    const [moved] = ids.splice(index, 1)
    if (!moved) return
    ids.splice(next, 0, moved)
    reorder.mutate(ids)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t('admin.topics')}</h1>
      {topics.isError ? <ErrorState title={t('admin.topics.error')} onRetry={() => void topics.refetch()} /> : null}
      {topics.data && items.length === 0 ? <EmptyState title={t('admin.topics.empty')} description={t('admin.topics.empty_hint')} /> : null}
      <ul className="flex flex-col gap-2">
        {items.map((topic, index) => (
          <TopicRow key={topic.id} topic={topic} is_first={index === 0} is_last={index === items.length - 1} onMove={move} />
        ))}
      </ul>
      <TopicForm
        upload={(field, onUploaded) => (
          <ImageUploadButton label={t(field === 'avatar' ? 'admin.topics.avatar' : 'admin.topics.cover')} onUploaded={onUploaded} />
        )}
      />
    </div>
  )
}

export default function AdminTopicsPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
    setArticleTopicId(null)
  }, [setHeaderCenter, setArticleTopicId])

  return (
    <RequireRole role="superadmin">
      <TopicsScreen />
    </RequireRole>
  )
}
