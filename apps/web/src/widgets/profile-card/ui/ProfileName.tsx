import type { Profile } from '@/entities/profile'
import type { ReactNode } from 'react'

type ProfileNameProps = { profile: Profile; aside?: ReactNode }

export function ProfileName({ profile, aside }: ProfileNameProps) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <h1 className="min-w-0 break-words text-2xl font-semibold leading-tight tracking-tight">
        {profile.display_name}
      </h1>
      {aside}
    </div>
  )
}
