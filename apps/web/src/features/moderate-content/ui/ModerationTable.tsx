import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { createModerationReturnState } from '@/entities/admin'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'
import { DataTable } from '@/shared/ui/DataTable'
import type { DataColumn } from '@/shared/ui/DataTable'
export type ModerationTableRow = {
  id: string
  href: string
  content: string
  author: string
  reporter?: string
  date: string
  status: string
  reason?: string
  actions: ReactNode
}
export function ModerationTable({
  rows,
  toolbar,
  label,
  is_loading,
  error,
  pagination,
}: {
  rows: ModerationTableRow[]
  toolbar: ReactNode
  label: string
  is_loading: boolean
  error?: { title: string; onRetry: () => void }
  pagination?: { is_loading: boolean; onLoadMore: () => void }
}) {
  const { t, locale } = useT()
  const { pathname, search } = useLocation()
  const columns: DataColumn<ModerationTableRow>[] = [
    {
      id: 'content',
      label,
      render: (row) => (
        <Link
          className="block max-w-72 whitespace-pre-wrap break-words text-accent"
          to={row.href}
          state={createModerationReturnState(`${pathname}${search}`)}
        >
          {row.content || t('admin.moderation.open')}
        </Link>
      ),
    },
    { id: 'author', label: t('admin.table.author'), render: (row) => row.author },
    { id: 'reporter', label: t('admin.table.reporter'), render: (row) => row.reporter ?? '—' },
    {
      id: 'date',
      label: t('admin.table.date'),
      render: (row) => <time dateTime={row.date}>{new Date(row.date).toLocaleDateString(locale)}</time>,
    },
    { id: 'status', label: t('admin.table.status'), render: (row) => row.status },
    {
      id: 'reason',
      label: t('comment.report_reason'),
      render: (row) => (
        <span className="block max-w-64 whitespace-pre-wrap break-words">{row.reason ?? '—'}</span>
      ),
    },
    { id: 'actions', label: t('admin.table.actions'), render: (row) => row.actions },
  ]
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {toolbar}
      <DataTable
        items={rows}
        columns={columns}
        getKey={(row) => row.id}
        label={label}
        is_loading={is_loading}
        error={error}
        empty={
          <EmptyState
            title={t('admin.moderation.reports_empty')}
            description={t('admin.moderation.reports_empty_hint')}
          />
        }
        pagination={pagination ? { ...pagination, label: t('feed.load_more') } : undefined}
      />
    </div>
  )
}
