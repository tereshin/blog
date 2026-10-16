import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/get-settings.ts'
import { settingsKeys } from './settings-keys.ts'

/** Настройки площадки редко меняются: держим дольше обычного. */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.public(),
    queryFn: ({ signal }) => getSettings(signal),
    staleTime: 5 * 60_000,
    // The event stream is unavailable during maintenance; polling restores access.
    refetchInterval: (query) => (query.state.data?.maintenance_enabled ? 15_000 : 60_000),
  })
}
