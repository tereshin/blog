import type { Profile } from '@/entities/profile'
import type { ReactNode } from 'react'
import { IdentityHeader } from '@/shared/ui'

type ProfileAvatarProps = { profile: Profile; action?: ReactNode }

export function ProfileAvatar({ profile, action }: ProfileAvatarProps) {
  return <IdentityHeader.Avatar src={profile.avatar_url} name={profile.display_name} action={profile.is_own ? action : null} />
}
