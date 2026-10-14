import { useFollowStates } from '@/features/follow'
import { useViewer } from '@/entities/session'
import type { UserListItemModel } from '@/entities/user'

export function useShortPeopleList(people: UserListItemModel[]) {
  const { is_own } = useViewer()
  const follows = useFollowStates(
    people
      .filter((person) => !is_own(person.user_id))
      .map((person) => ({ target_type: 'user', target_id: person.user_id })),
  )
  return { follows, is_own }
}
