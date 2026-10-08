import { useEffect } from 'react'
import { useParams } from 'react-router'
import { getFollowers, userKeys } from '@/entities/user'
import { PeopleList } from '@/widgets/profile-card'
import { useShellStore } from '@/widgets/shell'

export default function FollowersPage() {
  const { slug = '' } = useParams()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])
  return <PeopleList title_key="profile.followers_title" query_key={userKeys.followers(slug)} load={getFollowers} />
}
