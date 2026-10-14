import { useParams } from 'react-router'
import { getFollowers, userKeys } from '@/entities/user'
import { PeopleList } from '@/widgets/profile-card'
import { useShellPage } from '@/widgets/shell'

export default function FollowersPage() {
  const { slug = '' } = useParams()
  useShellPage()
  return <PeopleList title_key="profile.followers_title" query_key={userKeys.followers(slug)} load={getFollowers} />
}
