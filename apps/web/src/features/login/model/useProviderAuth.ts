import { useQuery } from '@tanstack/react-query'
import type { AuthConfig } from '@blog/contracts'
import { prepareFirebaseAuth } from '../lib/firebase-auth.ts'

export function useProviderAuth(config: AuthConfig | undefined, is_open: boolean) {
  const has_providers = config?.providers.some((provider) => provider.id !== 'password') ?? false
  const query = useQuery({
    queryKey: ['auth', 'popup-client', config?.project_id],
    queryFn: async () => {
      if (!config) throw new Error('Auth configuration is unavailable')
      await prepareFirebaseAuth(config)
      return true
    },
    enabled: is_open && has_providers,
    staleTime: Infinity,
    retry: false,
  })
  return { is_ready: query.isSuccess, is_error: query.isError, retry: () => void query.refetch() }
}
