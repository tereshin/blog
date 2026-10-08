import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileKeys, updateProfile } from '@/entities/profile'
import type { ProfileUpdate } from '@/entities/profile'
import { sessionKeys } from '@/entities/session'

export function useUpdateProfile() {
  const query_client = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileUpdate) => updateProfile(input),
    onSuccess: async (profile) => {
      const slug = profile.slug ?? String(profile.public_number)
      await query_client.invalidateQueries({ queryKey: profileKeys.detail(slug) })
      await query_client.invalidateQueries({ queryKey: sessionKeys.current() })
    },
  })
}
