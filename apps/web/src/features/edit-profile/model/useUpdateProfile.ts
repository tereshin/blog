import { useMatch, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileKeys, updateProfile } from '@/entities/profile'
import type { Profile, ProfileUpdate } from '@/entities/profile'
import { sessionKeys } from '@/entities/session'
import type { Session } from '@/entities/session'

export function useUpdateProfile() {
  const query_client = useQueryClient()
  const navigate = useNavigate()
  const current_slug = useMatch('/u/:slug')?.params.slug
  return useMutation({
    mutationFn: (input: ProfileUpdate) => updateProfile(input),
    onSuccess: async (profile, input) => {
      const current_profile = current_slug ? query_client.getQueryData<Profile>(profileKeys.detail(current_slug)) : undefined
      const slug = profile.slug ?? String(profile.public_number)
      query_client.setQueryData(profileKeys.detail(slug), profile)
      query_client.setQueryData(profileKeys.detail(String(profile.public_number)), profile)
      if (input.slug !== undefined && current_slug && current_slug !== slug && current_profile?.user_id === profile.user_id) {
        query_client.setQueryData(profileKeys.detail(current_slug), profile)
        void navigate(`/u/${slug}`, { replace: true })
      }
      await query_client.invalidateQueries({ queryKey: profileKeys.all })
      await query_client.invalidateQueries({ queryKey: sessionKeys.current() })
      // Копия профиля в identity обновляется событием и может отставать от ответа content.
      query_client.setQueryData<Session>(sessionKeys.current(), (session) => {
        if (session?.status !== 'member' || session.user.id !== profile.user_id) return session
        return {
          ...session,
          profile: { ...session.profile, display_name: profile.display_name, avatar_url: profile.avatar_url, slug },
        }
      })
    },
  })
}
