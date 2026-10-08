import { useQuery } from '@tanstack/react-query'
import { getProfile } from '../api/get-profile.ts'
import { profileKeys } from './profile-keys.ts'

export function useProfile(slug: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(slug ?? ''),
    queryFn: ({ signal }) => getProfile(slug ?? '', signal),
    enabled: Boolean(slug),
  })
}
