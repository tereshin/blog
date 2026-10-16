import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, FormTextField, Select } from '@/shared/ui'
import { DataTable } from '@/shared/ui/DataTable'
import type { DataColumn } from '@/shared/ui/DataTable'
import type { AdminUser } from '../api/users.ts'
import { useMemberSearch } from '../model/useManageMembers.ts'
import { MemberRow } from './MemberRow.tsx'

export function MemberSearch() {
  const { t, locale } = useT()
  const [q, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [cursors, setCursors] = useState<string[]>([])
  const deferred_query = useDeferredValue(q.trim())
  const result = useMemberSearch(deferred_query, role, cursors.at(-1))
  const columns: DataColumn<AdminUser>[] = [
    {
      id: 'name',
      label: t('profile.display_name'),
      render: (user) => (
        <Link className="text-accent" to={`/u/${encodeURIComponent(user.slug || user.id)}`}>
          {user.display_name || `#${user.public_number}`}
        </Link>
      ),
    },
    {
      id: 'email',
      label: t('admin.members.email'),
      render: (user) => (
        <div>
          <span>{user.email || '—'}</span>
          {user.email ? (
            <p className="text-xs text-muted">
              {t(
                user.email_verified
                  ? 'admin.members.email_verified'
                  : 'admin.members.email_unverified',
              )}
            </p>
          ) : null}
        </div>
      ),
    },
    { id: 'number', label: '№', render: (user) => user.public_number },
    {
      id: 'role',
      label: t('admin.members.access'),
      render: (user) => t(`admin.members.access_${user.role}`),
    },
    {
      id: 'status',
      label: t('admin.table.status'),
      render: (user) => t(user.is_restricted ? 'admin.members.blocked' : 'admin.members.active'),
    },
    {
      id: 'date',
      label: t('admin.table.date'),
      render: (user) => new Date(user.created_at).toLocaleDateString(locale),
    },
    { id: 'actions', label: t('admin.table.actions'), render: (user) => <MemberRow user={user} /> },
  ]
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="grid items-end gap-4 sm:grid-cols-2">
        <FormTextField
          label={t('admin.members.search')}
          type="search"
          value={q}
          onChange={(event) => {
            setQuery(event.target.value)
            setCursors([])
          }}
        />
        <Select
          label={t('admin.members.access')}
          value={role}
          options={[
            { value: '', label: t('admin.filters.all') },
            ...(['member', 'admin', 'superadmin'] as const).map((value) => ({
              value,
              label: t(`admin.members.access_${value}`),
            })),
          ]}
          onChange={(value) => {
            setRole(value)
            setCursors([])
          }}
        />
      </div>
      <DataTable
        label={t('admin.members.people')}
        items={result.data?.items ?? []}
        columns={columns}
        getKey={(user) => user.id}
        is_loading={result.isPending}
        empty={<EmptyState title={t('admin.members.empty')} />}
        error={
          result.isError
            ? { title: t('error.unknown'), onRetry: () => void result.refetch() }
            : undefined
        }
      />
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          isDisabled={!cursors.length || result.isFetching}
          onPress={() => setCursors((current) => current.slice(0, -1))}
        >
          {t('admin.members.previous')}
        </Button>
        <span>
          {t('admin.members.page')} {cursors.length + 1}
        </span>
        <Button
          variant="secondary"
          isDisabled={!result.data?.next_cursor || result.isFetching}
          onPress={() => {
            const next = result.data?.next_cursor
            if (next) setCursors((current) => [...current, next])
          }}
        >
          {t('admin.members.next')}
        </Button>
      </div>
    </section>
  )
}
