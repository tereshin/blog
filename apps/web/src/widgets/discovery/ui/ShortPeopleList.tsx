import { useShortPeopleList } from '../model/useShortPeopleList.ts'
import type { UserListItemModel } from '@/entities/user'
import { useT } from '@/shared/i18n'
import { ErrorState, Skeleton } from '@/shared/ui'
import { DiscoveryFollow } from './DiscoveryFollow.tsx'
import { DiscoveryRow } from './DiscoveryRow.tsx'

type ShortPeopleListProps = { people: UserListItemModel[]; start_rank?: number }

export function ShortPeopleList({ people, start_rank }: ShortPeopleListProps) {
  const { t } = useT()
  const { follows, is_own } = useShortPeopleList(people)
  return (
    <>
      {follows.is_error ? <ErrorState title={t('follow.failed')} onRetry={follows.retry} /> : null}
      <ol>
        {people.map((person, index) => (
          <li key={person.user_id}>
            <DiscoveryRow
              href={person.href}
              name={person.display_name}
              slug={person.slug}
              avatar_url={person.avatar_url}
              {...(start_rank !== undefined ? { rank: start_rank + index } : {})}
              action={
                is_own(person.user_id) ? null : follows.is_pending ? (
                  <Skeleton className="h-8 w-24 rounded-pill" />
                ) : follows.is_error ? null : (
                  <DiscoveryFollow target_type="user" target_id={person.user_id} />
                )
              }
            />
          </li>
        ))}
      </ol>
    </>
  )
}
