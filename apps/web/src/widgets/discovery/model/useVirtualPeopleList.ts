import { useFollowStates } from '@/features/follow'
import { useViewer } from '@/entities/session'
import type { UserListItemModel } from '@/entities/user'
import { useWindowList } from '@/shared/lib'

export function useVirtualPeopleList(people: UserListItemModel[]) {
  const { is_own } = useViewer()
  const { virtualizer, scroll_margin, setElement, items } = useWindowList(
    people.map((person) => person.user_id),
  )
  const visible = items.flatMap((item) => {
    const person = people[item.index]
    return person && !is_own(person.user_id) ? [person] : []
  })
  const follows = useFollowStates(
    visible.map((person) => ({ target_type: 'user', target_id: person.user_id })),
  )
  return { follows, is_own, virtualizer, scroll_margin, setElement, items }
}
