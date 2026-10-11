import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Card, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import { useManageTopics } from '../model/useManageTopics.ts'
import { TopicForm } from './TopicForm.tsx'
import { TopicRow } from './TopicRow.tsx'

export function TopicManagement({
  upload,
}: {
  upload: (field: 'avatar' | 'cover', onUploaded: (url: string) => void) => ReactNode
}) {
  const { t } = useT()
  const { topics, reorder, move } = useManageTopics()
  const items = topics.data ?? []
  return (
    <div className="flex flex-col gap-5">
      {topics.isPending ? <Skeleton className="h-40" aria-label={t('common.loading')} /> : null}
      {topics.isError ? (
        <ErrorState title={t('admin.topics.error')} onRetry={() => void topics.refetch()} />
      ) : null}
      {reorder.isError ? (
        <p role="alert" className="text-sm text-danger">
          {t('admin.topics.error')}
        </p>
      ) : null}
      {topics.data && !items.length ? (
        <EmptyState title={t('admin.topics.empty')} description={t('admin.topics.empty_hint')} />
      ) : null}
      <ul className="flex flex-col gap-2">
        {items.map((topic, index) => (
          <TopicRow
            key={topic.id}
            topic={topic}
            is_first={index === 0 || reorder.isPending}
            is_last={index === items.length - 1 || reorder.isPending}
            onMove={move}
          />
        ))}
      </ul>
      <Card>
        <Card.Content>
          <TopicForm upload={upload} />
        </Card.Content>
      </Card>
    </div>
  )
}
