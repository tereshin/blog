import { useEffect } from 'react'
import { useParams } from 'react-router'
import { getFollowing, userKeys } from '@/entities/user'
import { PeopleList } from '@/widgets/profile-card'
import { useShellStore } from '@/widgets/shell'

export default function FollowingPage() {
  const { slug = '' } = useParams()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])
  return <PeopleList title_key="profile.following_title" query_key={userKeys.following(slug)} load={getFollowing} />
}
