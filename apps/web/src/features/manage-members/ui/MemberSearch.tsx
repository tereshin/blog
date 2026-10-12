import { FormTextField } from '@/shared/ui'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
import { useMemberSearch } from '../model/useManageMembers.ts'
import { MemberRow } from './MemberRow.tsx'

export function MemberSearch() {
  const { t } = useT()
  const [q, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const result = useMemberSearch(submitted)
  const admins = (result.data ?? []).filter((user) => user.role === 'admin')
  const people = (result.data ?? []).filter((user) => user.role === 'member')

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(q.trim())
        }}
      >
        <FormTextField
          label={t('admin.members.search')}
          value={q}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full"
        />
        <Button
          type="submit"
          variant="primary"
          className="self-start sm:self-end"
          isDisabled={!q.trim() || result.isFetching}
        >
          {t('admin.moderation.open')}
        </Button>
      </form>
      {submitted && result.isFetching ? <p role="status">{t('common.loading')}</p> : null}
      {submitted && result.isError ? (
        <ErrorState title={t('error.unknown')} onRetry={() => void result.refetch()} />
      ) : null}
      {submitted && result.data?.length === 0 ? (
        <EmptyState title={t('admin.members.empty')} />
      ) : null}
      {submitted &&
        result.data
          ?.filter((user) => user.role === 'superadmin')
          .map((user) => <MemberRow key={user.id} user={user} />)}
      {submitted && result.data ? (
        <>
          <h2 className="text-lg font-semibold">{t('admin.members.admins')}</h2>
          {admins.map((user) => (
            <MemberRow key={user.id} user={user} />
          ))}
          <h2 className="text-lg font-semibold">{t('admin.members.people')}</h2>
          {people.map((user) => (
            <MemberRow key={user.id} user={user} />
          ))}
        </>
      ) : null}
    </section>
  )
}
