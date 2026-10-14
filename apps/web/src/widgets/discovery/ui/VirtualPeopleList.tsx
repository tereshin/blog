import { useVirtualPeopleList } from '../model/useVirtualPeopleList.ts'
import type { UserListItemModel } from '@/entities/user'
import { useT } from '@/shared/i18n'
import { ErrorState, Skeleton } from '@/shared/ui'
import { DiscoveryFollow } from './DiscoveryFollow.tsx'
import { DiscoveryRow } from './DiscoveryRow.tsx'

type VirtualPeopleListProps = { people: UserListItemModel[]; start_rank?: number }

export function VirtualPeopleList({ people, start_rank }: VirtualPeopleListProps) {
  const { t } = useT()
  const { follows, is_own, virtualizer, scroll_margin, setElement, items } = useVirtualPeopleList(people)
  return (
    <>
      {follows.is_error ? <ErrorState title={t('follow.failed')} onRetry={follows.retry} /> : null}
      <ol ref={setElement} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const person = people[item.index]
          if (!person) return null
          return (
            <li
              key={person.user_id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              aria-posinset={item.index + 1}
              aria-setsize={people.length}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${item.start - scroll_margin}px)` }}
            >
              <DiscoveryRow
                href={person.href}
                name={person.display_name}
                slug={person.slug}
                avatar_url={person.avatar_url}
                {...(start_rank === undefined ? {} : { rank: start_rank + item.index })}
                action={
                  is_own(person.user_id) ? null : follows.is_pending ? (
                    <Skeleton className="h-8 w-24 rounded-pill" />
                  ) : follows.is_error ? null : (
                    <DiscoveryFollow target_type="user" target_id={person.user_id} />
                  )
                }
              />
            </li>
          )
        })}
      </ol>
    </>
  )
}
