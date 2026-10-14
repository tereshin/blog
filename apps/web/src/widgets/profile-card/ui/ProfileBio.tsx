import type { Profile } from '@/entities/profile'

type ProfileBioProps = { profile: Profile }

export function ProfileBio({ profile }: ProfileBioProps) {
  if (!profile.bio) return null
  return <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{profile.bio}</p>
}
