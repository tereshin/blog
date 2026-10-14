import { IdentityHeader } from '@/shared/ui'
import { ProfileCardRoot } from './ProfileCardRoot.tsx'
import { ProfileCover } from './ProfileCover.tsx'
import { ProfileAvatar } from './ProfileAvatar.tsx'
import { ProfileName } from './ProfileName.tsx'
import { ProfileReputation } from './ProfileReputation.tsx'
import { ProfileBio } from './ProfileBio.tsx'
import { ProfileCounts } from './ProfileCounts.tsx'
import { ProfileBadges } from './ProfileBadges.tsx'
import { ProfileTabs } from './ProfileTabs.tsx'

export const ProfileCard = Object.assign(
  ProfileCardRoot,
  {
    Cover: ProfileCover,
    Avatar: ProfileAvatar,
    Identity: IdentityHeader.Identity,
    Content: IdentityHeader.Content,
    Navigation: IdentityHeader.Navigation,
    Name: ProfileName,
    Reputation: ProfileReputation,
    Bio: ProfileBio,
    Counts: ProfileCounts,
    Badges: ProfileBadges,
    Tabs: ProfileTabs,
    Skeleton: IdentityHeader.Skeleton,
  },
)
