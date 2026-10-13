import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { EmptyState, Select } from '@/shared/ui'
import { DataTable } from '@/shared/ui/DataTable'
import { usePages } from '../model/usePages.ts'
export function PageList() {
  const { t } = useT()
  const { query, rows, status, setStatus } = usePages()
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Select
        label={t('pages.status')}
        value={status}
        options={[
          { value: 'all', label: t('pages.all') },
          { value: 'draft', label: t('pages.draft') },
          { value: 'published', label: t('pages.published') },
        ]}
        onChange={setStatus}
      />
      <DataTable
        label={t('pages.title')}
        items={rows}
        getKey={(row) => row.id}
        empty={<EmptyState title={t('pages.empty')} />}
        is_loading={query.isPending}
        {...(query.isError
          ? { error: { title: t('pages.load_error'), onRetry: () => void query.refetch() } }
          : {})}
        {...(query.hasNextPage
          ? {
              pagination: {
                label: t('pages.more'),
                is_loading: query.isFetchingNextPage,
                onLoadMore: () => void query.fetchNextPage(),
              },
            }
          : {})}
        columns={[
          {
            id: 'title',
            label: t('editor.title'),
            render: (row) => (
              <Link to={`/admin/pages/${row.id}`} className="text-accent">
                {row.title}
              </Link>
            ),
          },
          { id: 'slug', label: t('pages.slug'), render: (row) => `/pages/${row.slug}` },
          {
            id: 'status',
            label: t('pages.status'),
            render: (row) => (row.status === 'published' ? t('pages.published') : t('pages.draft')),
          },
          {
            id: 'updated',
            label: t('pages.updated'),
            render: (row) => <time>{new Date(row.updated_at).toLocaleDateString()}</time>,
          },
          {
            id: 'open',
            label: t('pages.open'),
            render: (row) =>
              row.status === 'published' ? (
                <Link to={`/pages/${row.slug}`} target="_blank" rel="noopener noreferrer">
                  {t('pages.open')}
                </Link>
              ) : null,
          },
        ]}
      />
    </div>
  )
}
