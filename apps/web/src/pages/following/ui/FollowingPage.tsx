import { useParams } from 'react-router'
import { getFollowing, userKeys } from '@/entities/user'
import { PeopleList } from '@/widgets/profile-card'
import { useShellPage } from '@/widgets/shell'

export default function FollowingPage() {
  const { slug = '' } = useParams()
  useShellPage()
  return <PeopleList title_key="profile.following_title" query_key={userKeys.following(slug)} load={getFollowing} />
}
