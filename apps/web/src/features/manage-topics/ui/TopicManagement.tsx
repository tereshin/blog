import { useState } from 'react'
import { Link } from 'react-router'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Button, EmptyState } from '@/shared/ui'
import { DataTable } from '@/shared/ui/DataTable'
import type { DataColumn } from '@/shared/ui/DataTable'
import { useManageTopics } from '../model/useManageTopics.ts'
import { TopicDialog } from './TopicDialog.tsx'
import type { TopicUpload } from './TopicForm.tsx'
export function TopicManagement({ upload }: { upload: TopicUpload }) {
  const { t } = useT()
  const { topics, update, reorder, move } = useManageTopics()
  const [dialog, setDialog] = useState<'create' | Topic | null>(null)
  const items = topics.data ?? []
  const columns: DataColumn<Topic>[] = [
    {
      id: 'title',
      label: t('admin.topics.title'),
      render: (topic) => (
        <div className="max-w-64">
          <Link className="text-accent" to={`/t/${topic.slug}`}>
            {topic.title}
          </Link>
          <p className="truncate text-sm text-muted">{topic.description}</p>
        </div>
      ),
    },
    { id: 'slug', label: t('admin.topics.slug'), render: (topic) => topic.slug },
    {
      id: 'status',
      label: t('admin.table.status'),
      render: (topic) =>
        t(topic.status === 'active' ? 'admin.topics.active' : 'admin.topics.archived'),
    },
    {
      id: 'order',
      label: t('admin.topics.order'),
      render: (topic) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            isDisabled={items[0]?.id === topic.id || reorder.isPending}
            onPress={() => move(topic.id, -1)}
          >
            {t('admin.topics.move_up')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={items.at(-1)?.id === topic.id || reorder.isPending}
            onPress={() => move(topic.id, 1)}
          >
            {t('admin.topics.move_down')}
          </Button>
        </div>
      ),
    },
    {
      id: 'actions',
      label: t('admin.table.actions'),
      render: (topic) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={() => setDialog(topic)}>
            {t('admin.topics.edit')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={update.isPending}
            onPress={() =>
              update.mutate({
                id: topic.id,
                body: { status: topic.status === 'active' ? 'archived' : 'active' },
              })
            }
          >
            {t(topic.status === 'active' ? 'admin.topics.archive' : 'admin.topics.restore')}
          </Button>
        </div>
      ),
    },
  ]
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Button variant="primary" className="self-start" onPress={() => setDialog('create')}>
        {t('admin.topics.create')}
      </Button>
      <DataTable
        label={t('shell.nav.topics')}
        items={items}
        columns={columns}
        getKey={(topic) => topic.id}
        is_loading={topics.isPending}
        error={
          topics.isError
            ? { title: t('admin.topics.error'), onRetry: () => void topics.refetch() }
            : undefined
        }
        empty={
          <EmptyState title={t('admin.topics.empty')} description={t('admin.topics.empty_hint')} />
        }
      />
      {update.isError || reorder.isError ? (
        <p role="alert" className="text-danger">
          {t('admin.topics.error')}
        </p>
      ) : null}
      <TopicDialog
        initial={dialog && dialog !== 'create' ? dialog : undefined}
        upload={dialog === 'create' ? undefined : upload}
        is_open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
      />
    </div>
  )
}
