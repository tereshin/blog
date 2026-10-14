import type { UserListItemModel } from '@/entities/user'
import { ShortPeopleList } from './ShortPeopleList.tsx'
import { VirtualPeopleList } from './VirtualPeopleList.tsx'

type DiscoveryPeopleListProps = { people: UserListItemModel[]; start_rank?: number }

export function DiscoveryPeopleList({ people, start_rank }: DiscoveryPeopleListProps) {
  return people.length > 100 ? (
    <VirtualPeopleList people={people} {...(start_rank === undefined ? {} : { start_rank })} />
  ) : (
    <ShortPeopleList people={people} {...(start_rank === undefined ? {} : { start_rank })} />
  )
}
